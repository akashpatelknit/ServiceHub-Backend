import { VendorService } from '../models/vendorService.model.js';
import { Category } from '../models/category.model.js';
import { Subcategory } from '../models/subcategory.model.js';
import { Vendor } from '../../../core/models/index.js';
import { Kyc } from '../../auth/models/kyc.model.js';
import { KYC_STATUS } from '../../auth/constants/kyc.constants.js';
import { ApiError, logger } from '../../../utils/index.js';
import { queues } from '../../../lib/queue/queues.js';
import { VENDOR_SERVICE_STATUS, VENDOR_SERVICE_TARGET_TYPE } from '../constants/catalog.constants.js';

const ACTIVE_STATUSES = [VENDOR_SERVICE_STATUS.PENDING, VENDOR_SERVICE_STATUS.APPROVED];

const TARGET_MODEL_SERVICE = {
  [VENDOR_SERVICE_TARGET_TYPE.CATEGORY]: Category,
  [VENDOR_SERVICE_TARGET_TYPE.SUBCATEGORY]: Subcategory,
};

async function notifyVendor(vendorServiceId) {
  const vendorService = await VendorService.findById(vendorServiceId)
    .populate('vendor', 'email firstName lastName')
    .populate('target', 'name');
  if (!vendorService?.vendor?.email) return;

  try {
    await queues.email.add('send-vendor-service-reviewed', {
      to: vendorService.vendor.email,
      template: 'vendorServiceReviewed',
      templateData: {
        vendorName: [vendorService.vendor.firstName, vendorService.vendor.lastName].filter(Boolean).join(' '),
        serviceName: vendorService.target?.name || 'the requested service',
        targetType: vendorService.targetType,
        status: vendorService.status,
        rejectionReason: vendorService.rejectionReason,
      },
    });
  } catch (error) {
    logger.error('Vendor service review email enqueue threw unexpectedly', {
      vendorServiceId,
      error: error.message,
    });
  }
}

export const VendorServiceService = {
  // A vendor browses the catalog and requests approval to offer everything under a
  // Category or Subcategory — deliberately broader than one leaf Service, so they
  // request "AC" or "AC Repair" once rather than every individual AC service. They
  // never set price or go live without this being approved by an Admin. Re-requesting
  // after a rejection resets the same record to pending rather than creating a
  // duplicate, since {vendor, targetType, target} is unique.
  async requestService(vendorId, targetType, targetId) {
    const kyc = await Kyc.findOne({ vendor: vendorId });
    if (!kyc || kyc.status !== KYC_STATUS.VERIFIED) {
      throw new ApiError(403, 'Your KYC must be verified before you can request to offer services');
    }

    const TargetModel = TARGET_MODEL_SERVICE[targetType];
    const target = await TargetModel.findById(targetId);
    if (!target || !target.isActive) {
      throw new ApiError(404, `${targetType === VENDOR_SERVICE_TARGET_TYPE.CATEGORY ? 'Category' : 'Subcategory'} not found or inactive`);
    }

    const existing = await VendorService.findOne({ vendor: vendorId, targetType, target: targetId });
    if (existing) {
      if (existing.status !== VENDOR_SERVICE_STATUS.REJECTED) {
        throw new ApiError(409, `You already have a ${existing.status} request for this ${targetType}`);
      }

      existing.status = VENDOR_SERVICE_STATUS.PENDING;
      existing.requestedAt = new Date();
      existing.reviewedBy = null;
      existing.reviewedAt = null;
      existing.rejectionReason = null;
      await existing.save();
      return existing;
    }

    return VendorService.create({ vendor: vendorId, targetType, target: targetId });
  },

  // Catalog entries this vendor can still request — active Categories and
  // Subcategories with no existing pending/approved mapping, merged into one flat,
  // name-sorted list (mixed granularity is the point: a vendor can request the whole
  // "AC" category or just the "AC Repair" subcategory). A previously-rejected mapping
  // stays visible here since requestService() re-opens it rather than blocking a
  // second attempt. Catalogs are admin-curated and small, so both collections are
  // fetched in full and paginated in memory rather than combined via a DB-level
  // cross-collection query.
  async listAvailable(vendorId, { page, limit, category, search }) {
    const taken = await VendorService.find({ vendor: vendorId, status: { $in: ACTIVE_STATUSES } })
      .select('targetType target')
      .lean();
    const takenCategoryIds = taken.filter((t) => t.targetType === VENDOR_SERVICE_TARGET_TYPE.CATEGORY).map((t) => t.target);
    const takenSubcategoryIds = taken
      .filter((t) => t.targetType === VENDOR_SERVICE_TARGET_TYPE.SUBCATEGORY)
      .map((t) => t.target);

    const categoryFilter = { isActive: true, _id: { $nin: takenCategoryIds } };
    if (category) categoryFilter._id = { $eq: category, $nin: takenCategoryIds };
    if (search) categoryFilter.$text = { $search: search };

    const subcategoryFilter = { isActive: true, _id: { $nin: takenSubcategoryIds } };
    if (category) subcategoryFilter.category = category;
    if (search) subcategoryFilter.$text = { $search: search };

    const [categories, subcategories] = await Promise.all([
      Category.find(categoryFilter).select('name description'),
      Subcategory.find(subcategoryFilter).select('name description category').populate('category', 'name'),
    ]);

    const merged = [
      ...categories.map((c) => ({
        _id: c._id,
        name: c.name,
        description: c.description,
        targetType: VENDOR_SERVICE_TARGET_TYPE.CATEGORY,
      })),
      ...subcategories.map((s) => ({
        _id: s._id,
        name: s.name,
        description: s.description,
        targetType: VENDOR_SERVICE_TARGET_TYPE.SUBCATEGORY,
        category: s.category,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    const total = merged.length;
    const items = merged.slice((page - 1) * limit, (page - 1) * limit + limit);

    return { items, total, page, limit };
  },

  async listMyRequests(vendorId, { page, limit, status }) {
    const filter = { vendor: vendorId };
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      VendorService.find(filter)
        .populate('target', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      VendorService.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  },

  async withdraw(vendorId, vendorServiceId) {
    const vendorService = await VendorService.findOne({ _id: vendorServiceId, vendor: vendorId });
    if (!vendorService) throw new ApiError(404, 'Request not found');
    if (vendorService.status !== VENDOR_SERVICE_STATUS.PENDING) {
      throw new ApiError(409, `Cannot withdraw a request that is already ${vendorService.status}`);
    }

    await vendorService.deleteOne();
  },

  async listRequests({ page, limit, status, search }) {
    const filter = {};
    if (status) filter.status = status;

    if (search) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matchingVendors = await Vendor.find({
        $or: [{ firstName: regex }, { lastName: regex }, { phoneNumber: regex }, { email: regex }],
      })
        .select('_id')
        .lean();
      filter.vendor = { $in: matchingVendors.map((v) => v._id) };
    }

    const [items, total] = await Promise.all([
      VendorService.find(filter)
        .populate('vendor', 'firstName lastName phoneNumber email')
        .populate('target', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      VendorService.countDocuments(filter),
    ]);

    // Admin's list needs KYC status inline (it gates whether a request should even be
    // actionable) without a second round-trip per row.
    const vendorIds = items.map((item) => item.vendor?._id).filter(Boolean);
    const kycRecords = await Kyc.find({ vendor: { $in: vendorIds } }).select('vendor status').lean();
    const kycStatusByVendor = new Map(kycRecords.map((k) => [String(k.vendor), k.status]));

    const itemsWithKyc = items.map((item) => ({
      ...item,
      vendor: item.vendor
        ? { ...item.vendor, kycStatus: kycStatusByVendor.get(String(item.vendor._id)) || null }
        : item.vendor,
    }));

    return { items: itemsWithKyc, total, page, limit };
  },

  async approve(vendorServiceId, adminId) {
    const vendorService = await VendorService.findById(vendorServiceId);
    if (!vendorService) throw new ApiError(404, 'Vendor service request not found');
    if (vendorService.status !== VENDOR_SERVICE_STATUS.PENDING) {
      throw new ApiError(409, `Request is already ${vendorService.status}`);
    }

    vendorService.status = VENDOR_SERVICE_STATUS.APPROVED;
    vendorService.reviewedBy = adminId;
    vendorService.reviewedAt = new Date();
    vendorService.rejectionReason = null;
    await vendorService.save();
    await notifyVendor(vendorService._id);
    return vendorService;
  },

  async reject(vendorServiceId, adminId, rejectionReason) {
    const vendorService = await VendorService.findById(vendorServiceId);
    if (!vendorService) throw new ApiError(404, 'Vendor service request not found');
    if (vendorService.status !== VENDOR_SERVICE_STATUS.PENDING) {
      throw new ApiError(409, `Request is already ${vendorService.status}`);
    }

    vendorService.status = VENDOR_SERVICE_STATUS.REJECTED;
    vendorService.reviewedBy = adminId;
    vendorService.reviewedAt = new Date();
    vendorService.rejectionReason = rejectionReason;
    await vendorService.save();
    await notifyVendor(vendorService._id);
    return vendorService;
  },
};
