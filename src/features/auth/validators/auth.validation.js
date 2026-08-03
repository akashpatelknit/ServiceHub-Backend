import { z } from 'zod';
import { AUTH_PROVIDERS } from '../constants/providers.constants.js';

const phoneNumber = z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);
const name = z.string().trim().min(1).max(50);

export const signupSchema = {
  body: z
    .object({
      provider: z.literal(AUTH_PROVIDERS.EMAIL).optional().default(AUTH_PROVIDERS.EMAIL),
      firstName: name.optional(),
      lastName: name.optional(),
      email: z.string().trim().toLowerCase().email('Invalid email format').optional(),
      phoneNumber: phoneNumber.optional(),
      password,
    })
    .refine((data) => Boolean(data.email || data.phoneNumber), {
      message: 'email or phoneNumber is required',
      path: ['email'],
    }),
};

export const loginSchema = {
  body: z.object({
    provider: z.enum(Object.values(AUTH_PROVIDERS)).optional().default(AUTH_PROVIDERS.EMAIL),
    identifier: z.string().trim().min(1, 'identifier is required'),
    password: z.string().min(1, 'password is required'),
  }),
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1).optional(),
  }),
};

export const logoutSchema = {
  body: z.object({}).passthrough(),
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email format'),
  }),
};

export const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, 'token is required'),
    newPassword: password,
  }),
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
