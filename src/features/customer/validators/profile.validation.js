import { z } from 'zod';
import { imageInputSchema } from '../../service-catalog/validators/common.validation.js';

const name = z.string().trim().min(1).max(50);
const email = z.string().trim().toLowerCase().email('Invalid email format');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must contain at least one letter and one number');

export const updateProfileSchema = {
  body: z
    .object({
      firstName: name.optional(),
      lastName: name.optional(),
      email: email.optional(),
      avatar: imageInputSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' }),
};

export const changePasswordSchema = {
  body: z
    .object({
      oldPassword: z.string().min(1, 'oldPassword is required'),
      newPassword: password,
    })
    .refine((data) => data.oldPassword !== data.newPassword, {
      message: 'newPassword must differ from oldPassword',
      path: ['newPassword'],
    }),
};
