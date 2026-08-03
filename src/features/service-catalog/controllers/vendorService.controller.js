import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { VendorServiceService } from '../services/vendorService.service.js';

export const VendorServiceController = {
  request: asyncHandler(async (req, res) => {
    const vendorService = await VendorServiceService.requestService(req.user._id, req.body.service);
    return res
      .status(StatusCodes.CREATED)
      .json(new ApiResponse(StatusCodes.CREATED, vendorService, 'Service requested'));
  }),

  listMine: asyncHandler(async (req, res) => {
    const result = await VendorServiceService.listMyRequests(req.user._id, req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Your requests retrieved'));
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
