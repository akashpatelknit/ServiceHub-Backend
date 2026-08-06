import { z } from 'zod';

export const searchQuerySchema = {
  query: z.object({
    q: z.string().trim().min(1, 'Search query is required'),
    limit: z.coerce.number().int().positive().max(50).optional(),
    // Suggestion dropdown calls omit this (tight per-group cap); the full results
    // page passes full=true to raise the cap. See SUGGESTION_LIMIT/FULL_RESULTS_LIMIT
    // in search.controller.js.
    full: z.enum(['true', 'false']).optional(),
  }),
};
