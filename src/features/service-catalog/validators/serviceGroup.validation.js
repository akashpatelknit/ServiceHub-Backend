import { z } from 'zod';
import { objectIdSchema, imageInputSchema, paginationSchema } from './common.validation.js';

export const createServiceGroupSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).optional(),
    image: imageInputSchema.optional(),
    subcategory: objectIdSchema,
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const updateServiceGroupSchema = {
  params: z.object({ serviceGroupId: objectIdSchema }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      description: z.string().trim().max(500).optional(),
      image: imageInputSchema.optional(),
      subcategory: objectIdSchema.optional(),
      sortOrder: z.coerce.number().int().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' }),
};

export const serviceGroupIdParamSchema = {
  params: z.object({ serviceGroupId: objectIdSchema }),
};

export const listServiceGroupsSchema = {
  query: paginationSchema.extend({
    category: objectIdSchema.optional(),
    subcategory: objectIdSchema.optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
};
