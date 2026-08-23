import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { VendorServiceService } from '../services/vendorService.service.js';

export const VendorServiceController = {
  request: asyncHandler(async (req, res) => {
    const vendorService = await VendorServiceService.requestService(req.user._id, req.body.targetType, req.body.targetId);
    return res
      .status(StatusCodes.CREATED)
      .json(new ApiResponse(StatusCodes.CREATED, vendorService, 'Service requested'));
  }),

  listAvailable: asyncHandler(async (req, res) => {
    const result = await VendorServiceService.listAvailable(req.user._id, req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Available services retrieved'));
  }),

  listMine: asyncHandler(async (req, res) => {
    const result = await VendorServiceService.listMyRequests(req.user._id, req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Your requests retrieved'));
  }),

  withdraw: asyncHandler(async (req, res) => {
    await VendorServiceService.withdraw(req.user._id, req.params.vendorServiceId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, null, 'Request withdrawn'));
  }),

  list: asyncHandler(async (req, res) => {
    const result = await VendorServiceService.listRequests(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Vendor service requests retrieved'));
  }),

  approve: asyncHandler(async (req, res) => {
    const vendorService = await VendorServiceService.approve(req.params.vendorServiceId, req.user._id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, vendorService, 'Request approved'));
  }),

  reject: asyncHandler(async (req, res) => {
    const vendorService = await VendorServiceService.reject(
      req.params.vendorServiceId,
      req.user._id,
      req.body.rejectionReason
    );
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, vendorService, 'Request rejected'));
  }),
};
