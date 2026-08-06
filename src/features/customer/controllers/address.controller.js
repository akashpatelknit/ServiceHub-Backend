import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../../../utils/index.js';
import { customerAddressService } from '../services/customerAddress.service.js';

export const listAddresses = asyncHandler(async (req, res) => {
  const result = await customerAddressService.list(req.user._id);
  return res.status(StatusCodes.OK).json(result);
});

export const createAddress = asyncHandler(async (req, res) => {
  const result = await customerAddressService.create(req.user._id, req.body);
  return res.status(StatusCodes.CREATED).json(result);
});

export const updateAddress = asyncHandler(async (req, res) => {
  const result = await customerAddressService.update(req.user._id, req.params.addressId, req.body);
  return res.status(StatusCodes.OK).json(result);
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const result = await customerAddressService.remove(req.user._id, req.params.addressId);
  return res.status(StatusCodes.OK).json(result);
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const result = await customerAddressService.setDefault(req.user._id, req.params.addressId);
  return res.status(StatusCodes.OK).json(result);
});
