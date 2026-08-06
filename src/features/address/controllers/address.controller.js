import { StatusCodes } from 'http-status-codes';
import { asyncHandler, ApiError } from '../../../utils/index.js';
import { addressService } from '../services/address.service.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';

const OWNER_TYPE_BY_IDENTITY = {
  [IDENTITIES.USER]: 'User',
  [IDENTITIES.VENDOR]: 'Vendor',
};

const ownerFromRequest = (req) => {
  const ownerType = OWNER_TYPE_BY_IDENTITY[req.identity];
  if (!ownerType) {
    throw new ApiError(403, 'This identity cannot own addresses');
  }
  return { ownerId: req.user._id, ownerType };
};

export const createAddress = asyncHandler(async (req, res) => {
  const result = await addressService.createAddress(req.body, ownerFromRequest(req));
  return res.status(StatusCodes.CREATED).json(result);
});

export const getAddress = asyncHandler(async (req, res) => {
  const result = await addressService.getAddress(req.params.addressId, ownerFromRequest(req));
  return res.status(StatusCodes.OK).json(result);
});

export const updateAddress = asyncHandler(async (req, res) => {
  const result = await addressService.updateAddress(req.params.addressId, req.body, ownerFromRequest(req));
  return res.status(StatusCodes.OK).json(result);
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const result = await addressService.deleteAddress(req.params.addressId, ownerFromRequest(req));
  return res.status(StatusCodes.OK).json(result);
});
