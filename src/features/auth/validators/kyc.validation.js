import { z } from 'zod';
import { DOCUMENT_TYPES } from '../constants/kyc.constants.js';

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const documentSchema = z.object({
  type: z.enum(Object.values(DOCUMENT_TYPES)),
  number: z.string().trim().min(5).max(20),
  frontImage: z.string().trim().url('frontImage must be a URL'),
  backImage: z.string().trim().url('backImage must be a URL').optional(),
});

// Step 1 — personal info
export const kycInfoSchema = {
  body: z.object({
    firstName: z.string().trim().min(2).max(50),
    lastName: z.string().trim().min(2).max(50),
    middleName: z.string().trim().max(50).optional(),
    dob: z.coerce.date(),
    email: z.string().trim().toLowerCase().email('Invalid email format'),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
    occupation: z.string().trim().max(100).optional(),
    address: objectIdSchema.optional(),
  }),
};

// Step 2 — documents
export const kycDocumentsSchema = {
  body: z.object({
    primaryDocument: documentSchema,
    secondaryDocument: documentSchema.optional(),
    selfieImage: z.string().trim().url('selfieImage must be a URL'),
  }),
};

// Step 3 — bank details
export const kycBankDetailsSchema = {
  body: z.object({
    accountHolderName: z.string().trim().min(1).max(100),
    accountNumber: z.string().trim().regex(/^[0-9]{9,18}$/, 'Account number must be 9-18 digits'),
    ifscCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'),
    bankName: z.string().trim().max(100).optional(),
    branchName: z.string().trim().max(100).optional(),
  }),
};

// Step 4 — payment
export const kycPaymentInitSchema = {
  body: z.object({
    currency: z.enum(['INR']).optional().default('INR'),
  }),
};

export const kycPaymentVerifySchema = {
  body: z.object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  }),
};
