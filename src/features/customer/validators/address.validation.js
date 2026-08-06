import { z } from 'zod';
import { objectIdSchema } from '../../service-catalog/validators/common.validation.js';

const geolocationSchema = z.object({ lat: z.number(), lng: z.number() });

const addressBody = z.object({
  street: z.string().trim().min(1, 'street is required'),
  city: z.string().trim().min(1, 'city is required'),
  state: z.string().trim().min(1, 'state is required'),
  pinCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'pinCode must be 6 digits'),
  label: z.enum(['Home', 'Work', 'Other']).optional(),
  landmark: z.string().trim().optional(),
  country: z.string().trim().optional(),
  geolocation: geolocationSchema.optional(),
});

export const createAddressSchema = { body: addressBody };

export const updateAddressSchema = {
  params: z.object({ addressId: objectIdSchema }),
  body: addressBody.partial(),
};

export const addressIdParamSchema = {
  params: z.object({ addressId: objectIdSchema }),
};
