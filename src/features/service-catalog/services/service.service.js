import { Service } from '../models/service.model.js';
import { AddOn } from '../models/addOn.model.js';
import { ApiError } from '../../../utils/index.js';

export const ServiceCatalogItemService = {
  // Subcategory/category are derived from the service group in the model's pre-save hook.
  async create(data, adminId) {
    return Service.create({ ...data, createdBy: adminId });
  },

  async update(serviceId, data, adminId) {
    const service = await Service.findById(serviceId);
    if (!service) throw new ApiError(404, 'Service not found');

    Object.assign(service, data, { updatedBy: adminId });
    await service.save();
    return service;
  },

  async delete(serviceId) {
    const service = await Service.findById(serviceId);
    if (!service) throw new ApiError(404, 'Service not found');

    const hasAddOns = await AddOn.exists({ service: serviceId });
    if (hasAddOns) {
      throw new ApiError(409, 'Cannot delete a service that has add-ons attached to it');
    }

    await service.deleteOne();
    return service;
  },

  async getById(serviceId) {
    const service = await Service.findById(serviceId);
    if (!service) throw new ApiError(404, 'Service not found');
    return service;
  },

  async list({ page, limit, category, subcategory, serviceGroup, isActive, search }) {
    const filter = {};
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (serviceGroup) filter.serviceGroup = serviceGroup;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.$text = { $search: search };

    const [items, total] = await Promise.all([
      Service.find(filter)
        .sort({ sortOrder: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Service.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  },
};
