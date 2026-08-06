import { User } from '../../../core/models/index.js';
import { Address } from '../../address/models/address.model.js';
import { ApiError } from '../../../utils/index.js';
import { CoreAccessor } from '../../auth/services/core.accessor.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';

const SAFE_FIELDS = '-password -refreshToken -passwordResetToken -passwordResetExpiry';

export const adminUserService = {
  async list({ page, limit, isActive, isBlocked, search }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (isBlocked !== undefined) filter.isBlocked = isBlocked;
    if (search) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      User.find(filter).select(SAFE_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(userId) {
    const user = await User.findById(userId).select(SAFE_FIELDS);
    if (!user) throw new ApiError(404, 'User not found');

    const addresses = await Address.find({ owner: userId, ownerType: 'User' });
    return { user, addresses };
  },

  async setBlocked(userId, isBlocked) {
    const current = await User.findById(userId).select('isBlocked');
    if (!current) throw new ApiError(404, 'User not found');

    const next = typeof isBlocked === 'boolean' ? isBlocked : !current.isBlocked;
    await CoreAccessor.setBlocked(IDENTITIES.USER, userId, next);
    return User.findById(userId).select(SAFE_FIELDS);
  },

  async setActive(userId, isActive) {
    const current = await User.findById(userId).select('isActive');
    if (!current) throw new ApiError(404, 'User not found');

    const next = typeof isActive === 'boolean' ? isActive : !current.isActive;
    const user = await User.findByIdAndUpdate(userId, { $set: { isActive: next } }, { new: true }).select(SAFE_FIELDS);
    return user;
  },
};
