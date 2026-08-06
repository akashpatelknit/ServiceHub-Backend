import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { AdminPaymentService } from '../services/adminPayment.service.js';

export const AdminPaymentController = {
  list: asyncHandler(async (req, res) => {
    const result = await AdminPaymentService.list(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Payments retrieved'));
  }),

  getById: asyncHandler(async (req, res) => {
    const payment = await AdminPaymentService.getById(req.params.id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, payment, 'Payment retrieved'));
  }),

  refund: asyncHandler(async (req, res) => {
    const payment = await AdminPaymentService.refund(req.params.id, req.body, req.user._id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, payment, 'Refund processed'));
  }),
};
