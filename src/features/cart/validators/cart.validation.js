import { z } from 'zod';
import { objectIdSchema } from '../../service-catalog/validators/common.validation.js';

export const addCartItemSchema = {
  body: z.object({
    itemType: z.enum(['service', 'product']),
    refId: objectIdSchema,
    quantity: z.coerce.number().int().positive().optional().default(1),
    selectedAddons: z.array(objectIdSchema).optional().default([]),
  }),
};

export const updateCartItemSchema = {
  params: z.object({ itemId: objectIdSchema }),
  body: z
    .object({
      quantity: z.coerce.number().int().positive().optional(),
      selectedAddons: z.array(objectIdSchema).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' }),
};

export const cartItemIdParamSchema = {
  params: z.object({ itemId: objectIdSchema }),
};
