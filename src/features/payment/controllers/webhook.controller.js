import { StatusCodes } from 'http-status-codes';
import { PaymentService } from '../services/payment.service.js';
import { asyncHandler } from '../../../utils/index.js';

export const WebhookController = {
  // req.body is the raw Buffer here (see routes/webhook.routes.js + app.js mount) —
  // required so the HMAC signature can be verified against the exact bytes Razorpay sent.
  razorpay: asyncHandler(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    await PaymentService.handleWebhookEvent(req.body, signature);
    return res.status(StatusCodes.OK).json({ success: true });
  }),
};
