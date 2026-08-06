import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../service-catalog/validators/common.validation.js';

export const listOrdersSchema = {
  query: paginationSchema.extend({
    type: z.enum(['service', 'product']).optional(),
  }),
};

export const orderNumberParamSchema = {
  params: z.object({ orderNumber: z.string().trim().min(1) }),
};

export const adminListOrdersSchema = {
  query: paginationSchema.extend({
    type: z.enum(['service', 'product']).optional(),
    status: z.string().trim().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    search: z.string().trim().min(1).optional(),
  }),
};

export const adminOrderIdParamSchema = {
  params: z.object({ id: objectIdSchema }),
};

// `status` can't be pinned to a fixed Zod enum here — this one endpoint updates both
// ServiceOrder and ProductOrder, which have different status vocabularies. It's
// validated as a non-empty string at this layer; the real enum + adjacency-list
// enforcement happens in ServiceOrderService/ProductOrderService.transitionStatus()
// (and each subtype's own Mongoose schema enum) once the order's actual type is known.
export const orderStatusUpdateSchema = {
  params: z.object({ id: objectIdSchema }),
  body: z.object({ status: z.string().trim().min(1) }),
};
