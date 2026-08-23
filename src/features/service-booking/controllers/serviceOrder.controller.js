import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { ServiceOrderService } from '../services/serviceOrder.service.js';
import { VendorCandidateService } from '../services/vendorCandidate.service.js';

export const ServiceOrderController = {
  vendorCandidates: asyncHandler(async (req, res) => {
    const { reasonCode, candidates } = await VendorCandidateService.getCandidates(req.params.id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, { reasonCode, candidates }, 'Vendor candidates fetched'));
  }),

  assignVendor: asyncHandler(async (req, res) => {
    const order = await ServiceOrderService.assignVendor(req.params.id, req.body.vendorId, req.user._id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, order, 'Vendor assigned'));
  }),
};
