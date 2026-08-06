import { z } from 'zod';
import { objectIdSchema, imageInputSchema, paginationSchema } from '../../service-catalog/validators/common.validation.js';
import { PRODUCT_STATUS, PRODUCT_PUBLISH_STATUS, PRODUCT_VISIBILITY } from '../constants/productCatalog.constants.js';

const manufacturerSchema = z
  .object({
    name: z.string().trim().max(150).optional(),
    brand: z.string().trim().max(150).optional(),
    generalDescription: z.string().trim().max(1000).optional(),
    generalShortDescription: z.string().trim().max(300).optional(),
  })
  .optional();

const productBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  shortDescription: z.string().trim().max(300).optional(),
  price: z.coerce.number().min(0),
  discountPrice: z.coerce.number().min(0).optional(),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  category: objectIdSchema.optional(),
  stock: z.coerce.number().int().min(0),
  inventoryCount: z.coerce.number().int().min(0).optional(),
  sku: z.string().trim().min(1).max(60),
  status: z.enum(PRODUCT_STATUS).optional(),
  publishStatus: z.enum(PRODUCT_PUBLISH_STATUS).optional(),
  visibility: z.enum(PRODUCT_VISIBILITY).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  manufacturer: manufacturerSchema,
  images: z.array(imageInputSchema).optional(),
  keywords: z.array(z.string().trim()).optional(),
});

export const createProductSchema = {
  body: productBodySchema,
};

export const updateProductSchema = {
  params: z.object({ productId: objectIdSchema }),
  body: productBodySchema.partial().refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' }),
};

export const productIdParamSchema = {
  params: z.object({ productId: objectIdSchema }),
};

export const listProductsSchema = {
  query: paginationSchema.extend({
    category: objectIdSchema.optional(),
    isActive: z.enum(['true', 'false']).optional(),
    status: z.enum(PRODUCT_STATUS).optional(),
    search: z.string().trim().min(1).optional(),
  }),
};
