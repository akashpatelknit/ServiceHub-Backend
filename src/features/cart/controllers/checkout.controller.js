import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { CheckoutService } from '../services/checkout.service.js';
import { AdminEvents } from '../../../lib/realtime/adminEvents.js';

export const CheckoutController = {
  checkout: asyncHandler(async (req, res) => {
    const result = await CheckoutService.checkout(req.user._id, req.body);

    // Fired only after checkout() resolves, i.e. strictly after the order
    // transaction has committed — never for a booking that might still roll back.
    if (result.serviceOrder) {
      AdminEvents.emitNewBooking({
        orderId: result.serviceOrder.orderId,
        orderNumber: result.serviceOrder.orderNumber,
        customerName: req.user.fullName,
        serviceNames: result.serviceOrder.serviceNames,
        amount: result.serviceOrder.totalAmount,
        createdAt: result.serviceOrder.createdAt,
      });
    }

    return res.status(StatusCodes.CREATED).json(new ApiResponse(StatusCodes.CREATED, result, 'Checkout successful'));
  }),
};
