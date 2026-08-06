import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { AdminOrderService } from '../services/adminOrder.service.js';

export const AdminOrderController = {
  list: asyncHandler(async (req, res) => {
    const result = await AdminOrderService.list(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Orders retrieved'));
  }),

  getById: asyncHandler(async (req, res) => {
    const order = await AdminOrderService.getById(req.params.id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, order, 'Order retrieved'));
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const order = await AdminOrderService.updateStatus(req.params.id, req.body.status, req.user._id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, order, 'Order status updated'));
  }),
};
