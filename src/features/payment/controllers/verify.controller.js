import { StatusCodes } from 'http-status-codes';
import { PaymentService } from '../services/payment.service.js';
import { asyncHandler, ApiResponse } from '../../../utils/index.js';

export const VerifyController = {
  verify: asyncHandler(async (req, res) => {
    const payment = await PaymentService.verifyPayment(req.body);
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, { status: payment.status }, 'Payment verified'));
  }),
};
