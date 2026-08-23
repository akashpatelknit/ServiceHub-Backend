// Phase 1 (admin manually assigns from a ranked list, no broadcast/accept flow).
// Kept as its own constants file so Phase 2 (broadcast + first-to-accept) can reuse the
// same geospatial/eligibility query without touching the admin candidate-list logic.

// Generous outer bound for the $geoNear query — per-vendor filtering against
// vendor.serviceRadius happens afterward in application code, since $geoNear's
// maxDistance is a single global cutoff and can't vary per document.
export const MAX_CANDIDATE_RADIUS_KM = 50;

// A vendor is "busy" once they're carrying this many concurrently assigned/in-progress
// ServiceOrders — workloadScore bottoms out at 0 from here rather than going negative.
export const WORKLOAD_SATURATION_CAP = 5;

// Orders counted as "currently on a vendor's plate" for the workload factor.
export const ACTIVE_ORDER_STATUSES = ['assigned', 'in-progress'];

// Orders counted toward the reliability factor: did an assignment stick through to
// completion, or get cancelled after the vendor was already assigned?
export const RELIABILITY_ORDER_STATUSES = ['completed', 'cancelled'];

// Vendors with no completed/cancelled assignment history yet get this score rather than
// 0 or 100 — no track record shouldn't read as "unreliable", but it also shouldn't
// outrank a vendor with a proven good record.
export const NEUTRAL_RELIABILITY_SCORE = 70;

// Named, explainable weights — no rating source is wired to ServiceOrder yet (see
// vendorCandidate.service.js), so RATING is reserved at 0 rather than invented. When a
// rating source exists, give it a share of the other three's weight so they keep summing
// to 1.
export const SCORE_WEIGHTS = {
  DISTANCE: 0.5,
  WORKLOAD: 0.3,
  RELIABILITY: 0.2,
  RATING: 0,
};

// A candidate is badged isTopPick if its score is within this many points of the
// top score — lets close ties badge together instead of forcing one artificial winner.
export const TOP_PICK_SCORE_MARGIN = 5;

export const CANDIDATE_REASON_CODES = {
  NO_VENDORS_IN_RANGE: 'no-vendors-in-range',
  ALL_UNAVAILABLE: 'all-unavailable',
  NO_APPROVED_SERVICE_MAPPING: 'no-approved-service-mapping',
  NO_APPROVED_KYC: 'no-approved-kyc',
};
