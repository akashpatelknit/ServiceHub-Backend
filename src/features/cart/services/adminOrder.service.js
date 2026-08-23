import { CustomerOrder } from '../../order-core/index.js';
import { ServiceOrderService, SERVICE_ORDER_TRANSITIONS } from '../../service-booking/index.js';
import { ProductOrderService, PRODUCT_ORDER_TRANSITIONS } from '../../product-order/index.js';
import { User, Vendor, Admin } from '../../../core/models/index.js';
import { ApiError } from '../../../utils/index.js';

const delegateFor = (order) => (order.orderType === 'service' ? ServiceOrderService : ProductOrderService);
const transitionsFor = (order) => (order.orderType === 'service' ? SERVICE_ORDER_TRANSITIONS : PRODUCT_ORDER_TRANSITIONS);

// Attached to every order the admin API returns so the frontend never has to
// duplicate the transition state machine — it just renders whatever's in this list
// (empty array means terminal status, e.g. completed/cancelled/delivered/returned).
// Accepts either a Mongoose document (list()) or an already-plain object (getById(),
// which needs to mutate statusHistory before this runs — see resolveStatusHistoryActors).
const withAllowedNextStatuses = (order) => {
  const plain = typeof order.toObject === 'function' ? order.toObject() : order;
  return { ...plain, allowedNextStatuses: transitionsFor(plain)[plain.status] || [] };
};

// statusHistory.changedBy is a dynamic refPath (User/Vendor/Admin per entry) with a
// 4th possible changedByModel value, 'System', for automatic transitions (e.g. the
// expiry cron) — there's no Mongoose model registered for 'System' since it's not a
// real actor collection. Mongoose's own refPath .populate() resolves the model map for
// every distinct value up front and throws immediately if any of them isn't
// registered, before it ever reaches a per-entry lookup — so it can't be used as-is
// here. Resolved manually instead: one query per real model actually present, System
// entries simply keep changedBy: null.
const ACTOR_MODELS = { User, Vendor, Admin };

const resolveStatusHistoryActors = async (entries = []) => {
  const idsByModel = {};
  for (const entry of entries) {
    if (entry.changedByModel && ACTOR_MODELS[entry.changedByModel] && entry.changedBy) {
      (idsByModel[entry.changedByModel] ??= new Set()).add(String(entry.changedBy));
    }
  }

  const docsByModel = {};
  await Promise.all(
    Object.entries(idsByModel).map(async ([modelName, idSet]) => {
      const docs = await ACTOR_MODELS[modelName].find({ _id: { $in: [...idSet] } }).select('firstName lastName email');
      docsByModel[modelName] = new Map(docs.map((d) => [String(d._id), d]));
    })
  );

  return entries.map((entry) => ({
    ...entry,
    changedBy: (entry.changedByModel && docsByModel[entry.changedByModel]?.get(String(entry.changedBy))) || null,
  }));
};

// $regex is built from admin-supplied free text — escape regex metacharacters so an
// unbalanced paren/bracket can't 500 the endpoint (and isn't a ReDoS surface).
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const AdminOrderService = {
  async list({ page, limit, type, status, dateFrom, dateTo, search }) {
    const filter = {};
    if (type) filter.orderType = type;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = dateFrom;
      if (dateTo) filter.createdAt.$lte = dateTo;
    }

    if (search) {
      const safeSearch = escapeRegExp(search);
      const matchingUsers = await User.find({
        $or: [
          { firstName: { $regex: safeSearch, $options: 'i' } },
          { lastName: { $regex: safeSearch, $options: 'i' } },
          { email: { $regex: safeSearch, $options: 'i' } },
        ],
      }).select('_id');

      filter.$or = [{ orderNumber: { $regex: safeSearch, $options: 'i' } }, { user: { $in: matchingUsers.map((u) => u._id) } }];
    }

    // `assignedVendor` only exists on the ServiceOrder discriminator schema — Mongoose
    // populate no-ops on ProductOrder docs in the same result set rather than erroring.
    const [items, total] = await Promise.all([
      CustomerOrder.find(filter)
        .populate('user', 'firstName lastName email phoneNumber')
        .populate('assignedVendor', 'firstName lastName phoneNumber')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      CustomerOrder.countDocuments(filter),
    ]);

    return { items: items.map(withAllowedNextStatuses), total, page, limit };
  },

  async getById(orderId) {
    // changedBy resolved manually (see resolveStatusHistoryActors) — only needed on
    // the single-order fetch, not list(), since the list table never renders the
    // timeline.
    const order = await CustomerOrder.findById(orderId)
      .populate('user', 'firstName lastName email phoneNumber')
      .populate('assignedVendor', 'firstName lastName phoneNumber');
    if (!order) throw new ApiError(404, 'Order not found');

    const plain = order.toObject();
    plain.statusHistory = await resolveStatusHistoryActors(plain.statusHistory);
    return withAllowedNextStatuses(plain);
  },

  async updateStatus(orderId, status, adminId) {
    const order = await CustomerOrder.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    return delegateFor(order).transitionStatus(order, status, { id: adminId, model: 'Admin' });
  },
};
