import { z } from 'zod';

const rangeQuery = {
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
};

export const dashboardSummarySchema = {
  query: z.object(rangeQuery),
};

export const dashboardRevenueTrendSchema = {
  query: z.object({ ...rangeQuery, granularity: z.enum(['day', 'week']).optional() }),
};

export const dashboardCategoryPerformanceSchema = {
  query: z.object(rangeQuery),
};

export const dashboardRecentActivitySchema = {
  query: z.object({ limit: z.coerce.number().int().positive().max(50).optional().default(10) }),
};
