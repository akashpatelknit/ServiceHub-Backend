import { STATUS } from '../../constants/constants.js';
import { Vendor } from '../../models/index.js';
import { addressService } from '../../features/address/services/address.service.js';
import { asyncHandler, ApiError } from '../../utils/index.js';

export const addProductDeliveryAddress = asyncHandler(async (req, res) => {
  try {
    const result = await addressService.createAddress(req.body);
    const { data } = result;
    const vendor = await Vendor.findById(req.user._id);
    if (!vendor.productDeliverAddress) {
      vendor.productDeliverAddress = [];
    }
    vendor.productDeliverAddress.push({
      address: data?._id,
      isDefault: vendor.productDeliverAddress.length === 0 ? true : false,
    });
    await vendor.save();
    res.status(STATUS.OK).json(result);
  } catch (error) {
    throw new ApiError(STATUS.BAD_REQUEST, error.message || 'Something went wrong');
  }
});

export const updateProductDeliveryAddress = asyncHandler(async (req, res) => {
  try {
    const { addressId } = req.params;

    const vendor = await Vendor.findById(req.user._id);
    if (!vendor) {
      throw new ApiError(STATUS.NOT_FOUND, 'Vendor not found');
    }

    const addressExists = vendor.productDeliverAddress?.some((addr) => addr.address.toString() === addressId);

    if (!addressExists) {
      throw new ApiError(STATUS.FORBIDDEN, 'Address not found or does not belong to this vendor');
    }

    const result = await addressService.updateAddress(addressId, req.body);

    res.status(STATUS.OK).json(result);
  } catch (error) {
    throw new ApiError(STATUS.BAD_REQUEST, error.message || 'Failed to update address');
  }
});

export const getProductDeliveryAddresses = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.user._id).populate({
    path: 'productDeliverAddress.address',
    model: 'Address',
  });

  if (!vendor) throw new ApiError(STATUS.NOT_FOUND, 'Vendor not found');

  const addresses = vendor.productDeliverAddress.map((item) => ({
    id: item.address?._id,
    isDefault: item.isDefault,
    completeAddress: item.address?.completeAddress,
    line1: item.address?.line1,
    city: item.address?.city,
    state: item.address?.state,
    country: item.address?.country,
    postalCode: item.address?.postalCode,
    location: item.address?.location,
  }));

  res.status(STATUS.OK).json({
    success: true,
    count: addresses.length,
    data: addresses,
  });
});
