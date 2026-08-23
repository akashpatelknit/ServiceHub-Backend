import { z } from 'zod';
import { ADMIN_SUB_ROLES } from '../constants/permissions.constants.js';
import { REJECTION_REASONS, KYC_STATUS } from '../constants/kyc.constants.js';
import { objectIdSchema } from './kyc.validation.js';

export const assignAdminSubRoleSchema = {
  params: z.object({ adminId: objectIdSchema }),
  body: z.object({
    subRole: z.enum(Object.values(ADMIN_SUB_ROLES)),
  }),
};

export const kycReviewParamsSchema = z.object({ vendorId: objectIdSchema });

export const adminListKycSchema = {
  query: z.object({
    status: z.enum(Object.values(KYC_STATUS)).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
};

export const adminGetKycSchema = {
  params: kycReviewParamsSchema,
};

export const approveKycSchema = {
  params: kycReviewParamsSchema,
  body: z.object({
    comments: z.string().trim().max(1000).optional(),
  }),
};

export const rejectKycSchema = {
  params: kycReviewParamsSchema,
  body: z.object({
    reason: z.enum(Object.values(REJECTION_REASONS)),
    comments: z.string().trim().max(1000).optional(),
  }),
};
