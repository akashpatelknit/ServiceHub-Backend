import { Address } from '../models/address.model.js';
import { ApiError } from '../../../utils/index.js';
import { addressValidationSchema } from '../validators/address.validation.js';

// An address created before ownership stamping existed has no `owner` yet — permissive
// until the backfill migration runs, then every doc has one and this path stops firing.
const assertOwnership = (address, owner) => {
  if (!owner || !address.owner) return;
  if (address.owner.toString() !== owner.ownerId.toString() || address.ownerType !== owner.ownerType) {
    throw new ApiError(403, 'You do not have access to this address');
  }
};

class AddressService {
  async createAddress(addressData, owner) {
    try {
      const { error, value } = addressValidationSchema.validate(addressData, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        throw new ApiError(400, error.message || 'Address validation failed');
      }

      if (owner) {
        value.ownerType = owner.ownerType;
        value.owner = owner.ownerId;
        const existingCount = await Address.countDocuments({ owner: owner.ownerId, ownerType: owner.ownerType });
        value.isDefault = existingCount === 0;
      }

      const newAddress = await Address.create(value);

      return {
        success: true,
        message: 'Address created successfully',
        data: newAddress,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(400, error.message || 'Address validation failed');
    }
  }

  async updateAddress(addressId, updateData, owner) {
    try {
      if (!addressId) {
        throw new ApiError(400, 'Address ID is required');
      }

      const existingAddress = await Address.findById(addressId);
      if (!existingAddress) {
        throw new ApiError(404, 'Address not found');
      }
      assertOwnership(existingAddress, owner);

      const { error, value } = addressValidationSchema.validate(updateData, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        throw new ApiError(400, error.message || 'Address validation failed');
      }

      const updatedAddress = await Address.findByIdAndUpdate(addressId, value, { new: true, runValidators: true });

      return {
        success: true,
        message: 'Address updated successfully',
        data: updatedAddress,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(400, error.message || 'Failed to update address');
    }
  }

  async getAddress(addressId, owner) {
    if (!addressId) {
      throw new ApiError(400, 'Address ID is required');
    }

    const address = await Address.findById(addressId);
    if (!address) {
      throw new ApiError(404, 'Address not found');
    }
    assertOwnership(address, owner);

    return { success: true, message: 'Address retrieved successfully', data: address };
  }

  async deleteAddress(addressId, owner) {
    if (!addressId) {
      throw new ApiError(400, 'Address ID is required');
    }

    const address = await Address.findById(addressId);
    if (!address) {
      throw new ApiError(404, 'Address not found');
    }
    assertOwnership(address, owner);

    const wasDefault = address.isDefault;
    await Address.findByIdAndDelete(addressId);

    if (wasDefault && owner) {
      const another = await Address.findOne({ owner: owner.ownerId, ownerType: owner.ownerType }).sort({ createdAt: 1 });
      if (another) {
        another.isDefault = true;
        await another.save();
      }
    }

    return { success: true, message: 'Address deleted successfully', data: null };
  }

  async listForOwner(owner) {
    const addresses = await Address.find({ owner: owner.ownerId, ownerType: owner.ownerType }).sort({ isDefault: -1, createdAt: 1 });
    return { success: true, message: 'Addresses retrieved successfully', data: addresses };
  }

  async setDefault(addressId, owner) {
    const address = await Address.findById(addressId);
    if (!address) {
      throw new ApiError(404, 'Address not found');
    }
    assertOwnership(address, owner);

    await Address.updateMany({ owner: owner.ownerId, ownerType: owner.ownerType, _id: { $ne: addressId } }, { $set: { isDefault: false } });
    address.isDefault = true;
    await address.save();

    return { success: true, message: 'Default address updated', data: address };
  }
}

const addressService = new AddressService();

export { addressService, AddressService };
