import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../service-catalog/validators/common.validation.js';
import { VENDOR_STATUS_VALUES } from '../constants/vendorStatus.constants.js';

export const listVendorsSchema = {
  query: paginationSchema.extend({
    status: z.enum(VENDOR_STATUS_VALUES).optional(),
    search: z.string().trim().optional(),
  }),
};

export const vendorIdParamSchema = {
  params: z.object({ id: objectIdSchema }),
};

export const updateVendorStatusSchema = {
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    status: z.enum(VENDOR_STATUS_VALUES),
    blockReason: z.string().trim().max(500).optional(),
  }),
};
