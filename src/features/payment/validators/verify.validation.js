import { z } from 'zod';

// Razorpay's ids (order_xxx, pay_xxx) are opaque gateway strings, not Mongo
// ObjectIds — no objectIdSchema reuse here.
export const verifyPaymentSchema = {
  body: z.object({
    gatewayOrderId: z.string().trim().min(1),
    gatewayPaymentId: z.string().trim().min(1),
    gatewaySignature: z.string().trim().min(1),
  }),
};
