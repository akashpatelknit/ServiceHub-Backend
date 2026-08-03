import { z } from 'zod';
import { objectIdSchema, imageInputSchema, paginationSchema } from './common.validation.js';
import { DISPLAY_TYPES } from '../constants/catalog.constants.js';

const displayTypeSchema = z.enum(Object.values(DISPLAY_TYPES));

export const createCategorySchema = {
  body: z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).optional(),
    image: imageInputSchema.optional(),
    displayType: displayTypeSchema.optional(),
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const updateCategorySchema = {
  params: z.object({ categoryId: objectIdSchema }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      description: z.string().trim().max(500).optional(),
      image: imageInputSchema.optional(),
      displayType: displayTypeSchema.optional(),
      sortOrder: z.coerce.number().int().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' }),
};

export const categoryIdParamSchema = {
  params: z.object({ categoryId: objectIdSchema }),
};

export const listCategoriesSchema = {
  query: paginationSchema.extend({
    isActive: z.enum(['true', 'false']).optional(),
  }),
};
