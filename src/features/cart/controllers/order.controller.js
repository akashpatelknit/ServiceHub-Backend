import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { OrderService } from '../services/order.service.js';

export const OrderController = {
  list: asyncHandler(async (req, res) => {
    const result = await OrderService.list(req.user._id, req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Orders retrieved'));
  }),

  getByOrderNumber: asyncHandler(async (req, res) => {
    const order = await OrderService.getByOrderNumber(req.user._id, req.params.orderNumber);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, order, 'Order retrieved'));
  }),

  cancel: asyncHandler(async (req, res) => {
    const order = await OrderService.cancel(req.user._id, req.params.orderNumber);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, order, 'Order cancelled'));
  }),
};
