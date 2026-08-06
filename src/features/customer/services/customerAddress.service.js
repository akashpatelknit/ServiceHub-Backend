import { User } from '../../../core/models/index.js';
import { addressService } from '../../address/services/address.service.js';

const ownerOf = (userId) => ({ ownerId: userId, ownerType: 'User' });

export const customerAddressService = {
  list(userId) {
    return addressService.listForOwner(ownerOf(userId));
  },

  async create(userId, data) {
    const result = await addressService.createAddress(data, ownerOf(userId));
    if (result.data.isDefault) {
      await User.findByIdAndUpdate(userId, { defaultAddress: result.data._id });
    }
    return result;
  },

  update(userId, addressId, data) {
    return addressService.updateAddress(addressId, data, ownerOf(userId));
  },

  async remove(userId, addressId) {
    const result = await addressService.deleteAddress(addressId, ownerOf(userId));

    const remaining = await addressService.listForOwner(ownerOf(userId));
    const newDefault = remaining.data.find((address) => address.isDefault);
    await User.findByIdAndUpdate(userId, { defaultAddress: newDefault?._id ?? null });

    return result;
  },

  async setDefault(userId, addressId) {
    const result = await addressService.setDefault(addressId, ownerOf(userId));
    await User.findByIdAndUpdate(userId, { defaultAddress: addressId });
    return result;
  },
};
