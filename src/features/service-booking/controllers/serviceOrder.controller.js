import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { ServiceOrderService } from '../services/serviceOrder.service.js';

export const ServiceOrderController = {
  assignVendor: asyncHandler(async (req, res) => {
    const order = await ServiceOrderService.assignVendor(req.params.id, req.body.vendorId, req.user._id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, order, 'Vendor assigned'));
  }),
};
