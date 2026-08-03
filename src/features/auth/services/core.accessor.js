import { User, Vendor, Admin } from '../../../core/models/index.js';
import { ApiError } from '../../../utils/index.js';
import { IDENTITIES } from '../constants/roles.constants.js';

const MODEL_BY_IDENTITY = {
  [IDENTITIES.USER]: User,
  [IDENTITIES.VENDOR]: Vendor,
  [IDENTITIES.ADMIN]: Admin,
};

const USER_CORE_FIELDS = ['firstName', 'lastName', 'middleName', 'email', 'phoneNumber', 'dob', 'avatar'];
const VENDOR_CORE_FIELDS = [...USER_CORE_FIELDS, 'purpose', 'serviceRadius', 'isAvailable', 'isOnline', 'currentLocation'];

const modelFor = (identity) => {
  const Model = MODEL_BY_IDENTITY[identity];
  if (!Model) throw new ApiError(400, `Unknown identity: ${identity}`);
  return Model;
};

const pickAllowed = (updates, allowedFields) =>
  Object.fromEntries(Object.entries(updates).filter(([key]) => allowedFields.includes(key)));

/**
 * The only sanctioned way for OTHER features to touch User/Vendor/Admin core
 * fields going forward — narrow, allowlisted, no raw query access. See req. 5.
 */
export const CoreAccessor = {
  getUserById(id, projection) {
    return User.findById(id, projection);
  },

  getVendorById(id, projection) {
    return Vendor.findById(id, projection);
  },

  getAdminById(id, projection) {
    return Admin.findById(id, projection);
  },

  getActorById(identity, id, projection) {
    return modelFor(identity).findById(id, projection);
  },

  updateUserCoreFields(id, updates) {
    return User.findByIdAndUpdate(id, { $set: pickAllowed(updates, USER_CORE_FIELDS) }, { new: true, runValidators: true });
  },

  updateVendorCoreFields(id, updates) {
    return Vendor.findByIdAndUpdate(id, { $set: pickAllowed(updates, VENDOR_CORE_FIELDS) }, { new: true, runValidators: true });
  },

  setBlocked(identity, id, isBlocked, blockReason) {
    const Model = modelFor(identity);
    const updates = { isBlocked };
    if (identity === IDENTITIES.VENDOR && blockReason !== undefined) {
      updates.blockReason = blockReason;
    }
    return Model.findByIdAndUpdate(id, { $set: updates }, { new: true });
  },
};
