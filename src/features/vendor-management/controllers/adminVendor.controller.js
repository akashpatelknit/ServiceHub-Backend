import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { adminVendorService } from '../services/adminVendor.service.js';

export const listVendors = asyncHandler(async (req, res) => {
  const { page, limit, status, search } = req.query;
  const result = await adminVendorService.list({ page, limit, status, search });
  return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Success'));
});

export const getVendor = asyncHandler(async (req, res) => {
  const result = await adminVendorService.getById(req.params.id);
  return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Success'));
});

export const updateVendorStatus = asyncHandler(async (req, res) => {
  const vendor = await adminVendorService.setStatus(req.params.id, req.body.status, req.body.blockReason, req.user.subRole);
  return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, vendor, 'Vendor status updated'));
});
