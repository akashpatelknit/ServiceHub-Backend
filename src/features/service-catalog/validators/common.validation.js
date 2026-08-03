import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

// What the client sends back after uploading directly to R2 via the presigned URL
// returned by POST /media/presigned-url.
export const imageInputSchema = z.object({
  key: z.string().trim().min(1, 'key is required'),
  url: z.string().trim().url('url must be a valid URL'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
