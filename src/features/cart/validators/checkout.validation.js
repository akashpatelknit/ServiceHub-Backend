import { z } from 'zod';
import { objectIdSchema } from '../../service-catalog/validators/common.validation.js';

// scheduledDate/scheduledSlot are NOT conditionally required here even though the
// cart may contain service items — that check needs the cart's contents, which this
// middleware can't see (it only validates req.body, synchronously, before the cart is
// ever loaded). checkout.service.js enforces it once the cart is actually read.
export const checkoutSchema = {
  body: z.object({
    addressId: objectIdSchema,
    scheduledDate: z.coerce.date().optional(),
    scheduledSlot: z.string().trim().min(1).optional(),
    paymentMethod: z.enum(['razorpay']),
  }),
};
