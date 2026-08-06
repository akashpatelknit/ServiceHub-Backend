import { z } from 'zod';
import { objectIdSchema, imageInputSchema, paginationSchema } from '../../service-catalog/validators/common.validation.js';

export const createProductCategorySchema = {
  body: z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).optional(),
    image: imageInputSchema.optional(),
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const updateProductCategorySchema = {
  params: z.object({ categoryId: objectIdSchema }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      description: z.string().trim().max(500).optional(),
      image: imageInputSchema.optional(),
      sortOrder: z.coerce.number().int().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' }),
};

export const productCategoryIdParamSchema = {
  params: z.object({ categoryId: objectIdSchema }),
};

export const listProductCategoriesSchema = {
  query: paginationSchema.extend({
    isActive: z.enum(['true', 'false']).optional(),
    search: z.string().trim().min(1).optional(),
  }),
};
