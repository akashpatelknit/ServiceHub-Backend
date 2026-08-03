import { VendorService } from '../models/vendorService.model.js';
import { Service } from '../models/service.model.js';
import { ApiError } from '../../../utils/index.js';
import { VENDOR_SERVICE_STATUS } from '../constants/catalog.constants.js';

export const VendorServiceService = {
  // A vendor browses the catalog and requests to offer a service — they never set
  // price or go live without this being approved by an admin. Re-requesting after a
  // rejection resets the same record to pending rather than creating a duplicate,
  // since {vendor, service} is unique.
  async requestService(vendorId, serviceId) {
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      throw new ApiError(404, 'Service not found or inactive');
    }

    const existing = await VendorService.findOne({ vendor: vendorId, service: serviceId });
    if (existing) {
      if (existing.status !== VENDOR_SERVICE_STATUS.REJECTED) {
        throw new ApiError(409, `You already have a ${existing.status} request for this service`);
      }

      existing.status = VENDOR_SERVICE_STATUS.PENDING;
      existing.requestedAt = new Date();
      existing.reviewedBy = null;
      existing.reviewedAt = null;
      existing.rejectionReason = null;
      await existing.save();
      return existing;
    }

    return VendorService.create({ vendor: vendorId, service: serviceId });
  },

  async listMyRequests(vendorId, { page, limit, status }) {
    const filter = { vendor: vendorId };
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      VendorService.find(filter)
        .populate('service', 'name price durationMins isActive')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      VendorService.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  },

  async listRequests({ page, limit, status }) {
    const filter = {};
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      VendorService.find(filter)
        .populate('vendor', 'firstName lastName phoneNumber email')
        .populate('service', 'name price durationMins')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      VendorService.countDocuments(filter),
    ]);

    return { items, total, page, limit };
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
    return vendorService;
  },
};
