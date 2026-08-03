import { Address } from '../models/address.model.js';
import { ApiError } from '../../../utils/index.js';
import { addressValidationSchema } from '../validators/address.validation.js';

class AddressService {
  async createAddress(addressData) {
    try {
      const { error, value } = addressValidationSchema.validate(addressData, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        throw new ApiError(400, error.message || 'Address validation failed');
      }

      const newAddress = await Address.create(value);

      return {
        success: true,
        message: 'Address created successfully',
        data: newAddress,
      };
    } catch (error) {
      throw new ApiError(400, error.message || 'Address validation failed');
    }
  }

  async updateAddress(addressId, updateData) {
    try {
      if (!addressId) {
        throw new ApiError(400, 'Address ID is required');
      }

      const existingAddress = await Address.findById(addressId);
      if (!existingAddress) {
        throw new ApiError(404, 'Address not found');
      }

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

  async getAddress(addressId) {
    if (!addressId) {
      throw new ApiError(400, 'Address ID is required');
    }

    const address = await Address.findById(addressId);
    if (!address) {
      throw new ApiError(404, 'Address not found');
    }

    return { success: true, message: 'Address retrieved successfully', data: address };
  }

  async deleteAddress(addressId) {
    if (!addressId) {
      throw new ApiError(400, 'Address ID is required');
    }

    const deleted = await Address.findByIdAndDelete(addressId);
    if (!deleted) {
      throw new ApiError(404, 'Address not found');
    }

    return { success: true, message: 'Address deleted successfully', data: null };
  }
}

const addressService = new AddressService();

export { addressService, AddressService };
