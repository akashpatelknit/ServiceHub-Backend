export const VENDOR_STATUSES = {
  PENDING: 'pending',
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  SUSPENDED: 'suspended',
};

export const VENDOR_STATUS_VALUES = Object.values(VENDOR_STATUSES);

// Single source of truth for legal status changes — read by both the validator (to
// reject nonsense bodies early) and the service (to reject a technically-valid-enum
// value that isn't reachable from the vendor's current status). The frontend mirrors
// this shape in vendorStatus.js to decide which action buttons to show.
export const VENDOR_STATUS_TRANSITIONS = {
  [VENDOR_STATUSES.PENDING]: [VENDOR_STATUSES.ACTIVE, VENDOR_STATUSES.BLOCKED],
  [VENDOR_STATUSES.ACTIVE]: [VENDOR_STATUSES.BLOCKED, VENDOR_STATUSES.SUSPENDED],
  [VENDOR_STATUSES.BLOCKED]: [VENDOR_STATUSES.ACTIVE],
  [VENDOR_STATUSES.SUSPENDED]: [VENDOR_STATUSES.ACTIVE, VENDOR_STATUSES.BLOCKED],
};
