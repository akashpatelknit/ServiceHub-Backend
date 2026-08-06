import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../service-catalog/validators/common.validation.js';

const boolQueryParam = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

export const listUsersSchema = {
  query: paginationSchema.extend({
    isActive: boolQueryParam,
    isBlocked: boolQueryParam,
    search: z.string().trim().optional(),
  }),
};

export const userIdParamSchema = {
  params: z.object({ id: objectIdSchema }),
};

export const toggleBlockSchema = {
  params: z.object({ id: objectIdSchema }),
  body: z.object({ isBlocked: z.boolean().optional() }),
};

export const toggleActiveSchema = {
  params: z.object({ id: objectIdSchema }),
  body: z.object({ isActive: z.boolean().optional() }),
};
