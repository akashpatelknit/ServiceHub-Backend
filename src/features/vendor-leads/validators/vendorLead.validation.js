import { z } from 'zod';

// Same phone format used by features/auth/validators/auth.validation.js.
const phone = z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

export const createVendorLeadSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    phone,
    email: z.string().trim().toLowerCase().email('Invalid email format'),
    city: z.string().trim().min(1, 'City is required').max(100),
    category: z.string().trim().min(1, 'Category is required').max(100),
  }),
};
