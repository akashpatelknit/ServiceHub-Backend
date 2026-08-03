import { z } from 'zod';
import { objectIdSchema, imageInputSchema, paginationSchema } from './common.validation.js';

export const createServiceSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(150),
    description: z.string().trim().max(1000).optional(),
    price: z.coerce.number().min(0),
    mrp: z.coerce.number().min(0).optional(),
    durationMins: z.coerce.number().int().min(1),
    bullets: z.array(z.string().trim().min(1)).optional(),
    unitPriceLabel: z.string().trim().max(50).optional(),
    images: z.array(imageInputSchema).optional(),
    serviceGroup: objectIdSchema,
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const updateServiceSchema = {
  params: z.object({ serviceId: objectIdSchema }),
  body: z
    .object({
      name: z.string().trim().min(2).max(150).optional(),
      description: z.string().trim().max(1000).optional(),
      price: z.coerce.number().min(0).optional(),
      mrp: z.coerce.number().min(0).optional(),
      durationMins: z.coerce.number().int().min(1).optional(),
      bullets: z.array(z.string().trim().min(1)).optional(),
      unitPriceLabel: z.string().trim().max(50).optional(),
      images: z.array(imageInputSchema).optional(),
      serviceGroup: objectIdSchema.optional(),
      sortOrder: z.coerce.number().int().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' }),
};

export const serviceIdParamSchema = {
  params: z.object({ serviceId: objectIdSchema }),
};

export const listServicesSchema = {
  query: paginationSchema.extend({
    category: objectIdSchema.optional(),
    subcategory: objectIdSchema.optional(),
    serviceGroup: objectIdSchema.optional(),
    isActive: z.enum(['true', 'false']).optional(),
    search: z.string().trim().min(1).optional(),
  }),
};
