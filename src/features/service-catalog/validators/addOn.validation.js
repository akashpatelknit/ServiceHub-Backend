import { z } from 'zod';
import { objectIdSchema, imageInputSchema, paginationSchema } from './common.validation.js';

const exactlyOneTarget = (data) => Boolean(data.service) !== Boolean(data.serviceGroup);
const exactlyOneTargetMessage = { message: 'Provide exactly one of service or serviceGroup' };

export const createAddOnSchema = {
  body: z
    .object({
      name: z.string().trim().min(2).max(100),
      description: z.string().trim().max(500).optional(),
      price: z.coerce.number().min(0),
      image: imageInputSchema.optional(),
      service: objectIdSchema.optional(),
      serviceGroup: objectIdSchema.optional(),
      isActive: z.boolean().optional(),
    })
    .refine(exactlyOneTarget, exactlyOneTargetMessage),
};

export const updateAddOnSchema = {
  params: z.object({ addOnId: objectIdSchema }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      description: z.string().trim().max(500).optional(),
      price: z.coerce.number().min(0).optional(),
      image: imageInputSchema.optional(),
      service: objectIdSchema.optional(),
      serviceGroup: objectIdSchema.optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })
    .refine((data) => !(data.service && data.serviceGroup), exactlyOneTargetMessage),
};

export const addOnIdParamSchema = {
  params: z.object({ addOnId: objectIdSchema }),
};

export const listAddOnsSchema = {
  query: paginationSchema.extend({
    service: objectIdSchema.optional(),
    serviceGroup: objectIdSchema.optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
};
