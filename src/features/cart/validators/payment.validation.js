import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../service-catalog/validators/common.validation.js';

export const adminListPaymentsSchema = {
  query: paginationSchema.extend({
    status: z.enum(['created', 'pending', 'paid', 'failed', 'refunded']).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    search: z.string().trim().min(1).optional(),
  }),
};

export const adminPaymentIdParamSchema = {
  params: z.object({ id: objectIdSchema }),
};

export const refundPaymentSchema = {
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    // Omitted = full refund of whatever's still refundable — see PaymentService.initiateRefund.
    amount: z.coerce.number().positive().optional(),
    reason: z.string().trim().min(1).max(500).optional(),
  }),
};
