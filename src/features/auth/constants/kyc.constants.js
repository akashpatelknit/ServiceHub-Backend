export const KYC_STATUS = {
  DRAFT: 'draft',
  INFO_SUBMITTED: 'info_submitted',
  DOCUMENTS_SUBMITTED: 'documents_submitted',
  BANK_DETAILS_SUBMITTED: 'bank_details_submitted',
  PAYMENT_COMPLETED: 'payment_completed',
  PENDING_VERIFICATION: 'pending_verification',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

/**
 * Explicit forward-only transition table. A status can only move to one of
 * the statuses listed here — anything else is rejected at the service layer,
 * including admin approve/reject attempted before `pending_verification`.
 */
export const KYC_TRANSITIONS = {
  [KYC_STATUS.DRAFT]: [KYC_STATUS.INFO_SUBMITTED],
  [KYC_STATUS.INFO_SUBMITTED]: [KYC_STATUS.DOCUMENTS_SUBMITTED],
  [KYC_STATUS.DOCUMENTS_SUBMITTED]: [KYC_STATUS.BANK_DETAILS_SUBMITTED],
  [KYC_STATUS.BANK_DETAILS_SUBMITTED]: [KYC_STATUS.PAYMENT_COMPLETED],
  [KYC_STATUS.PAYMENT_COMPLETED]: [KYC_STATUS.PENDING_VERIFICATION],
  [KYC_STATUS.PENDING_VERIFICATION]: [KYC_STATUS.VERIFIED, KYC_STATUS.REJECTED],
  [KYC_STATUS.VERIFIED]: [],
  // A rejected vendor can resubmit — this is the one backward edge in an otherwise
  // forward-only machine. Previously-submitted info/documents/bankDetails snapshots
  // are left in place (not cleared) so the resubmit flow can pre-fill from them.
  [KYC_STATUS.REJECTED]: [KYC_STATUS.DRAFT],
};

export const DOCUMENT_TYPES = {
  PASSPORT: 'passport',
  DRIVING_LICENSE: 'driving_license',
  NATIONAL_ID: 'national_id',
  VOTER_ID: 'voter_id',
  AADHAAR: 'aadhaar',
};

export const REJECTION_REASONS = {
  OTHER: 'other',
  DOCUMENT_NOT_VERIFIED: 'document_not_verified',
  INCOMPLETE: 'incomplete',
  FRAUDULENT: 'fraudulent',
};

// R2 folder per document slot — mirrors features/service-catalog's CATALOG_MEDIA_FOLDERS
// presigned-upload pattern (MediaService.generatePresignedUploadUrl), scoped to KYC's
// own feature module instead of a cross-feature import.
export const KYC_DOCUMENT_SLOTS = {
  PRIMARY_FRONT: 'primary-front',
  PRIMARY_BACK: 'primary-back',
  SECONDARY_FRONT: 'secondary-front',
  SECONDARY_BACK: 'secondary-back',
  SELFIE: 'selfie',
};

export const ALLOWED_KYC_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const MAX_KYC_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
