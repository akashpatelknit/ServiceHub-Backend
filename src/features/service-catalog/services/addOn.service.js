import { AddOn } from '../models/addOn.model.js';
import { Service } from '../models/service.model.js';
import { ServiceGroup } from '../models/serviceGroup.model.js';
import { ApiError } from '../../../utils/index.js';

const assertTargetExists = async ({ service, serviceGroup }) => {
  if (service) {
    const exists = await Service.exists({ _id: service });
    if (!exists) throw new ApiError(404, 'Service not found');
  }

  if (serviceGroup) {
    const exists = await ServiceGroup.exists({ _id: serviceGroup });
    if (!exists) throw new ApiError(404, 'Service group not found');
  }
};

export const AddOnService = {
  async create(data, adminId) {
    await assertTargetExists(data);
    return AddOn.create({ ...data, createdBy: adminId });
  },

  async update(addOnId, data, adminId) {
    const addOn = await AddOn.findById(addOnId);
    if (!addOn) throw new ApiError(404, 'Add-on not found');

    await assertTargetExists(data);

    // Re-linking to the other target type must clear the previous one, or the
    // exactly-one-of pre-validate hook on the model will reject the save.
    if (data.service) addOn.serviceGroup = undefined;
    if (data.serviceGroup) addOn.service = undefined;

    Object.assign(addOn, data, { updatedBy: adminId });
    await addOn.save();
    return addOn;
  },

  async delete(addOnId) {
    const addOn = await AddOn.findById(addOnId);
    if (!addOn) throw new ApiError(404, 'Add-on not found');

    await addOn.deleteOne();
    return addOn;
  },

  async getById(addOnId) {
    const addOn = await AddOn.findById(addOnId);
    if (!addOn) throw new ApiError(404, 'Add-on not found');
    return addOn;
  },

  async list({ page, limit, service, serviceGroup, isActive }) {
    const filter = {};
    if (service) filter.service = service;
    if (serviceGroup) filter.serviceGroup = serviceGroup;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const [items, total] = await Promise.all([
      AddOn.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AddOn.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  },
};
