import { ServiceGroup } from '../models/serviceGroup.model.js';
import { Service } from '../models/service.model.js';
import { ApiError } from '../../../utils/index.js';

export const ServiceGroupService = {
  // Category is derived from the subcategory in the model's pre-save hook.
  async create(data, adminId) {
    return ServiceGroup.create({ ...data, createdBy: adminId });
  },

  async update(serviceGroupId, data, adminId) {
    const serviceGroup = await ServiceGroup.findById(serviceGroupId);
    if (!serviceGroup) throw new ApiError(404, 'Service group not found');

    Object.assign(serviceGroup, data, { updatedBy: adminId });
    await serviceGroup.save();
    return serviceGroup;
  },

  async delete(serviceGroupId) {
    const serviceGroup = await ServiceGroup.findById(serviceGroupId);
    if (!serviceGroup) throw new ApiError(404, 'Service group not found');

    const hasServices = await Service.exists({ serviceGroup: serviceGroupId });
    if (hasServices) {
      throw new ApiError(409, 'Cannot delete a service group that still has services');
    }

    await serviceGroup.deleteOne();
    return serviceGroup;
  },

  async getById(serviceGroupId) {
    const serviceGroup = await ServiceGroup.findById(serviceGroupId);
    if (!serviceGroup) throw new ApiError(404, 'Service group not found');
    return serviceGroup;
  },

  async list({ page, limit, category, subcategory, isActive }) {
    const filter = {};
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const [items, total] = await Promise.all([
      ServiceGroup.find(filter)
        .sort({ sortOrder: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ServiceGroup.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  },
};
