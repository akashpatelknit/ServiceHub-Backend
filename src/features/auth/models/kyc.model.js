import mongoose from 'mongoose';
import { KYC_STATUS, DOCUMENT_TYPES, REJECTION_REASONS } from '../constants/kyc.constants.js';

const documentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: Object.values(DOCUMENT_TYPES), required: true },
    number: { type: String, required: true, trim: true, uppercase: true },
    frontImage: { type: String, required: true, trim: true },
    backImage: { type: String, trim: true },
  },
  { _id: false }
);

// Step 1
const infoSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    dob: { type: Date, required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phoneNumber: { type: String, required: true, trim: true },
    occupation: { type: String, trim: true },
    address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
  },
  { _id: false }
);

// Step 2
const documentsStepSchema = new mongoose.Schema(
  {
    primaryDocument: { type: documentSchema, required: true },
    secondaryDocument: documentSchema,
    selfieImage: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// Step 3 — a self-contained snapshot for KYC verification, distinct from the
// wallet-payout BankAccount model (different lifecycle, different concern).
const bankDetailsSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    ifscCode: { type: String, required: true, trim: true, uppercase: true },
    bankName: { type: String, trim: true },
    branchName: { type: String, trim: true },
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(KYC_STATUS), required: true },
    note: { type: String, trim: true },
    actorId: { type: mongoose.Schema.Types.ObjectId },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const kycSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(KYC_STATUS),
      default: KYC_STATUS.DRAFT,
      index: true,
    },

    info: infoSchema,
    documents: documentsStepSchema,
    bankDetails: bankDetailsSchema,

    // Step 4 — set once the payment feature confirms the KYC payment succeeded.
    paymentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, enum: Object.values(REJECTION_REASONS) },
    reviewComments: { type: String, trim: true, maxlength: 1000 },

    history: [historySchema],
  },
  { timestamps: true }
);

kycSchema.index({ status: 1, createdAt: -1 });

export const Kyc = mongoose.model('Kyc', kycSchema);
