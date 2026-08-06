import { Payment } from '../../payment/index.js';
import { ServiceOrder, SERVICE_ORDER_STATUSES } from '../../service-booking/index.js';
import { CustomerOrder } from '../../order-core/index.js';
import { Kyc } from '../../auth/models/kyc.model.js';
import { KYC_STATUS } from '../../auth/constants/kyc.constants.js';
import { User } from '../../../core/models/index.js';
import { Service, Category } from '../../service-catalog/models/index.js';
import { resolveRange, previousPeriod, changePercent, resolveGranularity, bucketKey } from '../utils/period.util.js';
import { withCache } from '../utils/cache.util.js';

const sumPaidRevenue = async ({ from, to }) => {
  const result = await Payment.aggregate([
    { $match: { status: 'paid', createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total ?? 0;
};

// Grouped in application code rather than via a cross-collection $lookup — Service and
// Category live in separate collections registered under non-obvious Mongoose model
// names (CatalogService/CatalogCategory), and their default collection names aren't
// worth hardcoding into an aggregation pipeline when a plain find()-and-map is just as
// cheap at this scale and far easier to verify.
const aggregateCategoryStats = async ({ from, to }) => {
  const itemStats = await ServiceOrder.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.serviceId', bookingCount: { $sum: 1 }, revenue: { $sum: '$items.priceSnapshot' } } },
  ]);

  if (itemStats.length === 0) return [];

  const services = await Service.find({ _id: { $in: itemStats.map((s) => s._id) } })
    .select('category')
    .lean();
  const serviceCategoryMap = new Map(services.map((s) => [String(s._id), String(s.category)]));

  const categoryIds = [...new Set(services.map((s) => String(s.category)))];
  const categories = await Category.find({ _id: { $in: categoryIds } })
    .select('name')
    .lean();
  const categoryNameMap = new Map(categories.map((c) => [String(c._id), c.name]));

  const byCategory = new Map();
  for (const stat of itemStats) {
    const categoryId = serviceCategoryMap.get(String(stat._id));
    if (!categoryId) continue;
    const existing = byCategory.get(categoryId) ?? {
      categoryId,
      categoryName: categoryNameMap.get(categoryId) ?? 'Uncategorized',
      bookingCount: 0,
      revenue: 0,
    };
    existing.bookingCount += stat.bookingCount;
    existing.revenue += stat.revenue;
    byCategory.set(categoryId, existing);
  }

  return [...byCategory.values()];
};

export const DashboardService = {
  async getSummary({ dateFrom, dateTo }) {
    const range = resolveRange(dateFrom, dateTo);
    const prior = previousPeriod(range);

    return withCache('summary', range, 300, async () => {
      const [revenue, prevRevenue, bookings, prevBookings, activeUsers, prevActiveUsers, verifiedVendors, prevVerifiedVendors] =
        await Promise.all([
          sumPaidRevenue(range),
          sumPaidRevenue(prior),
          ServiceOrder.countDocuments({ createdAt: { $gte: range.from, $lte: range.to } }),
          ServiceOrder.countDocuments({ createdAt: { $gte: prior.from, $lte: prior.to } }),
          User.countDocuments({ isActive: true, lastLoginAt: { $gte: range.from, $lte: range.to } }),
          User.countDocuments({ isActive: true, lastLoginAt: { $gte: prior.from, $lte: prior.to } }),
          Kyc.countDocuments({ status: KYC_STATUS.VERIFIED, reviewedAt: { $gte: range.from, $lte: range.to } }),
          Kyc.countDocuments({ status: KYC_STATUS.VERIFIED, reviewedAt: { $gte: prior.from, $lte: prior.to } }),
        ]);

      return {
        revenue: { value: revenue, previousValue: prevRevenue, changePercent: changePercent(revenue, prevRevenue) },
        bookings: { value: bookings, previousValue: prevBookings, changePercent: changePercent(bookings, prevBookings) },
        activeUsers: {
          value: activeUsers,
          previousValue: prevActiveUsers,
          changePercent: changePercent(activeUsers, prevActiveUsers),
        },
        verifiedVendors: {
          value: verifiedVendors,
          previousValue: prevVerifiedVendors,
          changePercent: changePercent(verifiedVendors, prevVerifiedVendors),
        },
      };
    });
  },

  async getRevenueTrend({ dateFrom, dateTo, granularity }) {
    const range = resolveRange(dateFrom, dateTo);
    const unit = resolveGranularity(granularity, range);

    return withCache('revenue-trend', { ...range, unit }, 300, async () => {
      const [payments, orders] = await Promise.all([
        Payment.find({ status: 'paid', createdAt: { $gte: range.from, $lte: range.to } })
          .select('amount createdAt')
          .lean(),
        ServiceOrder.find({ createdAt: { $gte: range.from, $lte: range.to } })
          .select('createdAt')
          .lean(),
      ]);

      const buckets = new Map();
      const bucketFor = (date) => {
        const key = bucketKey(date, unit);
        if (!buckets.has(key)) buckets.set(key, { date: key, revenue: 0, bookings: 0 });
        return buckets.get(key);
      };

      for (const payment of payments) bucketFor(payment.createdAt).revenue += payment.amount;
      for (const order of orders) bucketFor(order.createdAt).bookings += 1;

      const points = [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
      return { granularity: unit, points };
    });
  },

  async getCategoryPerformance({ dateFrom, dateTo }) {
    const range = resolveRange(dateFrom, dateTo);
    const prior = previousPeriod(range);

    return withCache('category-performance', range, 300, async () => {
      const [current, previous] = await Promise.all([aggregateCategoryStats(range), aggregateCategoryStats(prior)]);
      const previousByCategory = new Map(previous.map((c) => [c.categoryId, c]));

      const categories = current
        .map((c) => ({
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          bookingCount: c.bookingCount,
          revenue: c.revenue,
          growthRate: changePercent(c.revenue, previousByCategory.get(c.categoryId)?.revenue ?? 0),
        }))
        .sort((a, b) => b.revenue - a.revenue);

      return { categories };
    });
  },

  async getActionNeeded() {
    return withCache('action-needed', {}, 60, async () => {
      const [unassignedBookings, pendingVendorVerifications, pendingPayments] = await Promise.all([
        ServiceOrder.countDocuments({ status: SERVICE_ORDER_STATUSES.CONFIRMED, assignedVendor: null }),
        Kyc.countDocuments({ status: KYC_STATUS.PENDING_VERIFICATION }),
        Payment.countDocuments({ status: { $in: ['failed', 'pending'] } }),
      ]);

      return { unassignedBookings, pendingVendorVerifications, pendingPayments };
    });
  },

  async getRecentActivity({ limit }) {
    return withCache('recent-activity', { limit }, 60, async () => {
      const orders = await CustomerOrder.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('user', 'firstName lastName')
        .lean();

      return {
        items: orders.map((order) => ({
          id: order._id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          customerName: [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || 'Unknown',
          status: order.status,
          amount: order.totalAmount,
          createdAt: order.createdAt,
        })),
      };
    });
  },
};
