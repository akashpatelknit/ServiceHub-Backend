import { z } from 'zod';
import { VENDOR_SERVICE_STATUS } from '../constants/catalog.constants.js';
import { objectIdSchema, paginationSchema } from './common.validation.js';

export const requestServiceSchema = {
  body: z.object({
    service: objectIdSchema,
  }),
};

export const vendorServiceIdParamSchema = {
  params: z.object({ vendorServiceId: objectIdSchema }),
};

export const rejectVendorServiceSchema = {
  params: z.object({ vendorServiceId: objectIdSchema }),
  body: z.object({
    rejectionReason: z.string().trim().min(3).max(500),
  }),
};

export const listMyVendorServicesSchema = {
  query: paginationSchema.extend({
    status: z.enum(Object.values(VENDOR_SERVICE_STATUS)).optional(),
  }),
};

export const listVendorServicesSchema = {
  query: paginationSchema.extend({
    status: z.enum(Object.values(VENDOR_SERVICE_STATUS)).optional(),
  }),
};
