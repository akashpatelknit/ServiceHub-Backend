import mongoose from 'mongoose';
const { Schema } = mongoose;

import { DOCUMENT_STATUS, DOCUMENT_TYPES, KYC_STATUS, VERIFICATION_ACTION } from '../../constants/index.js';

const DocumentSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(DOCUMENT_TYPES),
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.PENDING,
    },
    rejectionReason: {
      type: String, // Filled only when status = REJECTED
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const VerificationHistorySchema = new Schema(
  {
    action: {
      type: String,
      enum: Object.values(VERIFICATION_ACTION),
      required: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Admin who performed the action (null if system)
      default: null,
    },
    comments: {
      type: String, // Admin notes or rejection reason
      default: null,
    },
    previousStatus: {
      type: String,
      enum: Object.values(KYC_STATUS),
      default: null,
    },
    newStatus: {
      type: String,
      enum: Object.values(KYC_STATUS),
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const KYCSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },

    // ── Business Info (vendor-specific) ────────
    // companyName: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    // gstNumber: {
    //   type: String,
    //   required: true,
    //   uppercase: true,
    //   match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z]{1}[0-9A-Z]{1}$/, 'Invalid GST number format'],
    // },
    // panNumber: {
    //   type: String,
    //   required: true,
    //   uppercase: true,
    //   match: [/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN number format'],
    // },

    // ── Business Address ───────────────────────
    // businessAddress: {
    //   type: AddressSchema,
    //   required: true,
    // },

    // ── Documents ──────────────────────────────
    documents: {
      type: [DocumentSchema],
      default: [],
      validate: {
        validator: function (docs) {
          // When status is PENDING or beyond, at least one document must exist
          if (this.status !== KYC_STATUS.INCOMPLETE && docs.length === 0) {
            return false;
          }
          return true;
        },
        message: 'At least one document is required before submission.',
      },
    },

    // ── Status ─────────────────────────────────
    status: {
      type: String,
      enum: Object.values(KYC_STATUS),
      default: KYC_STATUS.INCOMPLETE,
      // Direct writes are blocked by the pre-save hook below.
      // Always use the helper methods instead.
    },

    // ── Rejection ──────────────────────────────
    rejectionReason: {
      type: String,
      default: null, // Cleared on resubmission
    },

    submittedAt: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null, // Set on approval
    },
    expiryDate: {
      type: Date,
      default: null, // approvedAt + 1 year
      index: true,
    },

    verificationHistory: {
      type: [VerificationHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: '__v',
  }
);

KYCSchema.index({ userId: 1 }, { unique: true });
KYCSchema.index({ status: 1 }); // Admin filtering by status
KYCSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 }); // TTL not used here, but indexed for cron
KYCSchema.index({ submittedAt: 1 }); // Sort pending queue by submission time

KYCSchema.methods.submit = async function () {
  if (this.status !== KYC_STATUS.INCOMPLETE && this.status !== KYC_STATUS.REJECTED) {
    throw new Error(
      `Cannot submit from current status: ${this.status}. Only INCOMPLETE or REJECTED records can be submitted.`
    );
  }

  if (this.documents.length === 0) {
    throw new Error('Upload at least one document before submitting.');
  }

  const previousStatus = this.status;

  this.$__statusChangeAllowed = true;
  this.status = KYC_STATUS.PENDING;
  this.submittedAt = this.submittedAt || new Date();
  this.rejectionReason = null; // Clear old rejection reason on resubmit

  this.verificationHistory.push({
    action: previousStatus === KYC_STATUS.REJECTED ? VERIFICATION_ACTION.RESUBMITTED : VERIFICATION_ACTION.SUBMITTED,
    performedBy: null, // Vendor action — no admin involved
    previousStatus,
    newStatus: this.status,
    comments: 'Vendor submitted KYC documents.',
  });

  await this.save();
  this.$__statusChangeAllowed = false;
};

KYCSchema.methods.moveToReview = async function (adminId) {
  if (this.status !== KYC_STATUS.PENDING) {
    throw new Error('Only PENDING applications can be moved to review.');
  }

  this.$__statusChangeAllowed = true;
  this.status = KYC_STATUS.UNDER_REVIEW;

  this.verificationHistory.push({
    action: VERIFICATION_ACTION.MOVED_TO_REVIEW,
    performedBy: adminId,
    previousStatus: KYC_STATUS.PENDING,
    newStatus: this.status,
    comments: 'Admin picked up for review.',
  });

  await this.save();
  this.$__statusChangeAllowed = false;
};

KYCSchema.methods.approve = async function (adminId, comments) {
  if (this.status !== KYC_STATUS.UNDER_REVIEW) {
    throw new Error('Only UNDER_REVIEW applications can be approved.');
  }

  this.$__statusChangeAllowed = true;
  this.status = KYC_STATUS.APPROVED;
  this.approvedAt = new Date();
  this.expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // +1 year

  // Mark all documents as verified
  this.documents.forEach((doc) => {
    doc.status = DOCUMENT_STATUS.VERIFIED;
  });

  this.verificationHistory.push({
    action: VERIFICATION_ACTION.APPROVED,
    performedBy: adminId,
    previousStatus: KYC_STATUS.UNDER_REVIEW,
    newStatus: this.status,
    comments: comments || 'KYC approved.',
  });

  await this.save();
  this.$__statusChangeAllowed = false;
};

KYCSchema.methods.reject = async function (adminId, reason) {
  if (this.status !== KYC_STATUS.UNDER_REVIEW) {
    throw new Error('Only UNDER_REVIEW applications can be rejected.');
  }

  if (!reason) {
    throw new Error('A rejection reason is required.');
  }

  this.$__statusChangeAllowed = true;
  this.status = KYC_STATUS.REJECTED;
  this.rejectionReason = reason;

  this.verificationHistory.push({
    action: VERIFICATION_ACTION.REJECTED,
    performedBy: adminId,
    previousStatus: KYC_STATUS.UNDER_REVIEW,
    newStatus: this.status,
    comments: reason,
  });

  await this.save();
  this.$__statusChangeAllowed = false;
};

// System marks as expired (run via cron)
KYCSchema.methods.markExpired = async function () {
  if (this.status !== KYC_STATUS.APPROVED) {
    throw new Error('Only APPROVED KYC records can be expired.');
  }

  this.$__statusChangeAllowed = true;
  this.status = KYC_STATUS.EXPIRED;

  this.verificationHistory.push({
    action: VERIFICATION_ACTION.EXPIRED,
    performedBy: null, // System action
    previousStatus: KYC_STATUS.APPROVED,
    newStatus: this.status,
    comments: 'KYC expired. Annual renewal required.',
  });

  await this.save();
  this.$__statusChangeAllowed = false;
};

export const KYC = mongoose.model('KYC', KYCSchema);
