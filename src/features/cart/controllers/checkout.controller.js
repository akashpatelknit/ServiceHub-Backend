import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { CheckoutService } from '../services/checkout.service.js';

export const CheckoutController = {
  checkout: asyncHandler(async (req, res) => {
    const result = await CheckoutService.checkout(req.user._id, req.body);
    return res.status(StatusCodes.CREATED).json(new ApiResponse(StatusCodes.CREATED, result, 'Checkout successful'));
  }),
};
