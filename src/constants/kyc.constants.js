export const KYC_STATUSES = Object.freeze({
  INCOMPLETE: 'incomplete',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  UNDER_REVIEW: 'under_review',
});

export const DOCUMENT_TYPES = Object.freeze({
  PASSPORT: 'passport',
  DRIVING_LICENSE: 'driving_license',
  NATIONAL_ID: 'national_id',
  VOTER_ID: 'voter_id',
  PAN_CARD: 'pan_card',
  AADHAAR: 'aadhaar',
});

export const ADDRESS_TYPES = Object.freeze({
  PERMANENT: 'permanent',
  CURRENT: 'current',
  BUSINESS: 'business',
  CORRESPONDENCE: 'correspondence',
  OTHER: 'other',
});
