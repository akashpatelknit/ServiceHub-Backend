import { User } from '../../../core/models/index.js';
import { ApiError } from '../../../utils/index.js';
import { AuthStrategyRegistry } from '../../auth/strategies/strategy.registry.js';
import { AUTH_PROVIDERS } from '../../auth/constants/providers.constants.js';

const SAFE_FIELDS = '-password -refreshToken -passwordResetToken -passwordResetExpiry';

export const profileService = {
  async getProfile(userId) {
    const user = await User.findById(userId).select(SAFE_FIELDS);
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  },

  async updateProfile(userId, updates) {
    if (updates.email) {
      const current = await User.findById(userId).select('email');
      if (!current) throw new ApiError(404, 'User not found');

      if (current.email !== updates.email) {
        const emailTaken = await User.exists({ email: updates.email, _id: { $ne: userId } });
        if (emailTaken) throw new ApiError(409, 'Email already in use');
        updates.isEmailVerified = false;
      }
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true }).select(SAFE_FIELDS);
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  },

  /** actor must be the full req.user document (password field included, as `authenticate` loads it). */
  async changePassword(actor, { oldPassword, newPassword }) {
    const strategy = AuthStrategyRegistry.resolve(AUTH_PROVIDERS.EMAIL);
    await strategy.changePassword({ oldPassword, newPassword }, actor);
  },
};
