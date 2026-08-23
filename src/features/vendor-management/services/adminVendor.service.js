import { Vendor } from '../../../core/models/index.js';
import { Address } from '../../address/models/address.model.js';
import { VendorService } from '../../service-catalog/models/vendorService.model.js';
import { VENDOR_SERVICE_STATUS } from '../../service-catalog/constants/catalog.constants.js';
import { CustomerOrder } from '../../order-core/index.js';
import { CoreAccessor } from '../../auth/services/core.accessor.js';
import { PermissionService } from '../../auth/services/permission.service.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from '../../auth/constants/permissions.constants.js';
import { ApiError } from '../../../utils/index.js';
import { VENDOR_STATUSES, VENDOR_STATUS_TRANSITIONS } from '../constants/vendorStatus.constants.js';

const SAFE_FIELDS = '-password -refreshToken -passwordResetToken -passwordResetExpiry';

// The fullName virtual doesn't survive .lean() reads, and list/detail both need it —
// computed once here so both paths agree, rather than one reading the virtual and the
// other not.
const fullNameOf = (vendor) => [vendor.firstName, vendor.middleName, vendor.lastName].filter(Boolean).join(' ');

export const adminVendorService = {
  async list({ page, limit, status, search }) {
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }, { phoneNumber: regex }];
    }

    const skip = (page - 1) * limit;
    const [vendors, total] = await Promise.all([
      Vendor.find(filter).select(SAFE_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Vendor.countDocuments(filter),
    ]);

    const vendorIds = vendors.map((v) => v._id);
    const approvedCounts = await VendorService.aggregate([
      { $match: { vendor: { $in: vendorIds }, status: VENDOR_SERVICE_STATUS.APPROVED } },
      { $group: { _id: '$vendor', count: { $sum: 1 } } },
    ]);
    const countByVendor = new Map(approvedCounts.map((c) => [String(c._id), c.count]));

    const items = vendors.map((vendor) => ({
      ...vendor,
      fullName: fullNameOf(vendor),
      approvedServiceCount: countByVendor.get(String(vendor._id)) || 0,
    }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(vendorId) {
    const vendor = await Vendor.findById(vendorId).select(SAFE_FIELDS);
    if (!vendor) throw new ApiError(404, 'Vendor not found');

    const [addresses, approvedServices, recentOrders] = await Promise.all([
      Address.find({ owner: vendorId, ownerType: 'Vendor' }),
      VendorService.find({ vendor: vendorId, status: VENDOR_SERVICE_STATUS.APPROVED }).populate('target', 'name'),
      CustomerOrder.find({ assignedVendor: vendorId, orderType: 'service' })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('orderNumber status createdAt scheduledDate'),
    ]);

    return {
      vendor: { ...vendor.toObject(), fullName: fullNameOf(vendor) },
      addresses,
      approvedServices,
      recentOrders,
    };
  },

  async setStatus(vendorId, status, blockReason, actingSubRole) {
    const vendor = await Vendor.findById(vendorId).select('status');
    if (!vendor) throw new ApiError(404, 'Vendor not found');

    const allowed = VENDOR_STATUS_TRANSITIONS[vendor.status] || [];
    if (!allowed.includes(status)) {
      throw new ApiError(400, `Cannot change vendor status from '${vendor.status}' to '${status}'`);
    }

    if (status === VENDOR_STATUSES.BLOCKED && !PermissionService.hasPermission(actingSubRole, PERMISSION_RESOURCES.VENDORS, PERMISSION_ACTIONS.BLOCK)) {
      throw new ApiError(403, 'You do not have permission to block vendors');
    }

    await CoreAccessor.setBlocked(IDENTITIES.VENDOR, vendorId, status === VENDOR_STATUSES.BLOCKED, blockReason);
    const updated = await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: { status, isVerified: status === VENDOR_STATUSES.ACTIVE } },
      { new: true }
    ).select(SAFE_FIELDS);

    return { ...updated.toObject(), fullName: fullNameOf(updated) };
  },
};
