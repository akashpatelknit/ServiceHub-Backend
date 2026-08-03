import { z } from 'zod';
import { ADMIN_SUB_ROLES } from '../constants/permissions.constants.js';
import { REJECTION_REASONS } from '../constants/kyc.constants.js';
import { objectIdSchema } from './kyc.validation.js';

export const assignAdminSubRoleSchema = {
  params: z.object({ adminId: objectIdSchema }),
  body: z.object({
    subRole: z.enum(Object.values(ADMIN_SUB_ROLES)),
  }),
};

export const kycReviewParamsSchema = z.object({ vendorId: objectIdSchema });

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
