import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../../../utils/index.js';
import { addressService } from '../services/address.service.js';

export const createAddress = asyncHandler(async (req, res) => {
  const result = await addressService.createAddress(req.body);
  return res.status(StatusCodes.CREATED).json(result);
});

export const getAddress = asyncHandler(async (req, res) => {
  const result = await addressService.getAddress(req.params.addressId);
  return res.status(StatusCodes.OK).json(result);
});

export const updateAddress = asyncHandler(async (req, res) => {
  const result = await addressService.updateAddress(req.params.addressId, req.body);
  return res.status(StatusCodes.OK).json(result);
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const result = await addressService.deleteAddress(req.params.addressId);
  return res.status(StatusCodes.OK).json(result);
});
