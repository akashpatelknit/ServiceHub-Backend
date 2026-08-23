import { Vendor } from '../../../core/models/index.js';
import { VendorService } from '../../service-catalog/models/vendorService.model.js';
import { Kyc } from '../../auth/models/kyc.model.js';
import { KYC_STATUS } from '../../auth/constants/kyc.constants.js';
import { VENDOR_SERVICE_STATUS } from '../../service-catalog/constants/catalog.constants.js';
import { ServiceOrder } from '../models/serviceOrder.model.js';
import { ApiError } from '../../../utils/index.js';
import {
  MAX_CANDIDATE_RADIUS_KM,
  WORKLOAD_SATURATION_CAP,
  ACTIVE_ORDER_STATUSES,
  NEUTRAL_RELIABILITY_SCORE,
  SCORE_WEIGHTS,
  TOP_PICK_SCORE_MARGIN,
  CANDIDATE_REASON_CODES,
} from '../constants/vendorMatching.constants.js';

const round2 = (n) => Math.round(n * 100) / 100;
const clamp01 = (n) => Math.min(1, Math.max(0, n));

const getOrderGeolocation = (order) => {
  const { lat, lng } = order.addressSnapshot?.geolocation || {};
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new ApiError(422, 'This order has no geolocation on its address snapshot — cannot match vendors by distance');
  }
  // GeoJSON is [longitude, latitude] — the reverse of the {lat, lng} shape stored on
  // the order. Mixing this up silently returns nonsense candidates, not an error.
  return { type: 'Point', coordinates: [lng, lat] };
};

// Shared by the candidate list (scored) and the assign-vendor guard (membership check)
// so both always agree on who counts as eligible right now.
async function getEligibleVendors(order) {
  const point = getOrderGeolocation(order);

  const vendorsInRange = await Vendor.aggregate([
    {
      $geoNear: {
        near: point,
        distanceField: 'distanceMeters',
        maxDistance: MAX_CANDIDATE_RADIUS_KM * 1000,
        spherical: true,
        // aggregate() bypasses the withSoftDelete find-hook, so isDeleted has to be
        // excluded explicitly here.
        query: { isDeleted: { $ne: true } },
      },
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        middleName: 1,
        phoneNumber: 1,
        serviceRadius: 1,
        isAvailable: 1,
        isBlocked: 1,
        isVerified: 1,
        distanceMeters: 1,
      },
    },
  ]);

  if (vendorsInRange.length === 0) {
    return { reasonCode: CANDIDATE_REASON_CODES.NO_VENDORS_IN_RANGE, vendors: [] };
  }

  // Per-vendor radius can't be expressed inside $geoNear (maxDistance is one global
  // cutoff), so it's applied here against each vendor's own serviceRadius.
  const withinOwnRadius = vendorsInRange.filter((v) => v.distanceMeters / 1000 <= v.serviceRadius);
  if (withinOwnRadius.length === 0) {
    return { reasonCode: CANDIDATE_REASON_CODES.NO_VENDORS_IN_RANGE, vendors: [] };
  }

  const available = withinOwnRadius.filter((v) => v.isAvailable && !v.isBlocked && v.isVerified);
  if (available.length === 0) {
    return { reasonCode: CANDIDATE_REASON_CODES.ALL_UNAVAILABLE, vendors: [] };
  }

  // A vendor is only eligible if approved to offer every service on the order — the
  // admin is assigning one vendor for the whole order, not per line item.
  const serviceIds = [...new Set(order.items.map((item) => String(item.serviceId)))];
  const mappings = await VendorService.find({
    vendor: { $in: available.map((v) => v._id) },
    service: { $in: serviceIds },
    status: VENDOR_SERVICE_STATUS.APPROVED,
  })
    .select('vendor service')
    .lean();

  const approvedServicesByVendor = new Map();
  for (const mapping of mappings) {
    const key = String(mapping.vendor);
    if (!approvedServicesByVendor.has(key)) approvedServicesByVendor.set(key, new Set());
    approvedServicesByVendor.get(key).add(String(mapping.service));
  }

  const serviceEligible = available.filter((v) => {
    const approved = approvedServicesByVendor.get(String(v._id));
    return approved && serviceIds.every((sid) => approved.has(sid));
  });
  if (serviceEligible.length === 0) {
    return { reasonCode: CANDIDATE_REASON_CODES.NO_APPROVED_SERVICE_MAPPING, vendors: [] };
  }

  // KYC lives entirely in features/auth's Kyc state machine (see core/models/vendor.model.js
  // comment) — not mirrored onto Vendor, so it's a separate lookup.
  const kycRecords = await Kyc.find({
    vendor: { $in: serviceEligible.map((v) => v._id) },
    status: KYC_STATUS.VERIFIED,
  })
    .select('vendor')
    .lean();
  const kycVerifiedIds = new Set(kycRecords.map((k) => String(k.vendor)));

  const kycEligible = serviceEligible.filter((v) => kycVerifiedIds.has(String(v._id)));
  if (kycEligible.length === 0) {
    return { reasonCode: CANDIDATE_REASON_CODES.NO_APPROVED_KYC, vendors: [] };
  }

  const vendorIds = kycEligible.map((v) => v._id);
  const workloadStats = await ServiceOrder.aggregate([
    { $match: { assignedVendor: { $in: vendorIds } } },
    {
      $group: {
        _id: '$assignedVendor',
        activeCount: { $sum: { $cond: [{ $in: ['$status', ACTIVE_ORDER_STATUSES] }, 1, 0] } },
        completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelledCount: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      },
    },
  ]);
  const statsByVendor = new Map(workloadStats.map((s) => [String(s._id), s]));

  const vendors = kycEligible.map((v) => {
    const stats = statsByVendor.get(String(v._id)) || { activeCount: 0, completedCount: 0, cancelledCount: 0 };
    const reliabilitySample = stats.completedCount + stats.cancelledCount;
    return {
      vendorId: v._id,
      fullName: [v.firstName, v.middleName, v.lastName].filter(Boolean).join(' '),
      phoneNumber: v.phoneNumber,
      distanceKm: round2(v.distanceMeters / 1000),
      serviceRadius: v.serviceRadius,
      currentActiveJobsCount: stats.activeCount,
      reliabilityScore: reliabilitySample === 0 ? NEUTRAL_RELIABILITY_SCORE : (stats.completedCount / reliabilitySample) * 100,
    };
  });

  return { reasonCode: null, vendors };
}

// distance/workload/reliability weighted sum — see vendorMatching.constants.js for the
// named weights. RATING is reserved at 0 (no rating source is wired to ServiceOrder yet)
// so it's simply omitted from the sum rather than scored as 0-and-counted.
function scoreCandidate({ distanceKm, serviceRadius, currentActiveJobsCount, reliabilityScore }) {
  const distanceScore = clamp01(1 - distanceKm / serviceRadius) * 100;
  const workloadScore = clamp01(1 - currentActiveJobsCount / WORKLOAD_SATURATION_CAP) * 100;

  const recommendationScore = Math.round(
    distanceScore * SCORE_WEIGHTS.DISTANCE + workloadScore * SCORE_WEIGHTS.WORKLOAD + reliabilityScore * SCORE_WEIGHTS.RELIABILITY
  );

  return recommendationScore;
}

export const VendorCandidateService = {
  async getCandidates(orderId) {
    const order = await ServiceOrder.findById(orderId);
    if (!order) throw new ApiError(404, 'Service order not found');

    const { reasonCode, vendors } = await getEligibleVendors(order);
    if (reasonCode) return { reasonCode, candidates: [] };

    const scored = vendors
      .map((v) => ({
        vendorId: v.vendorId,
        fullName: v.fullName,
        phoneNumber: v.phoneNumber,
        distanceKm: v.distanceKm,
        currentActiveJobsCount: v.currentActiveJobsCount,
        recommendationScore: scoreCandidate(v),
      }))
      .sort((a, b) => b.recommendationScore - a.recommendationScore || a.distanceKm - b.distanceKm);

    const topScore = scored[0]?.recommendationScore ?? 0;
    const candidates = scored.map((c) => ({ ...c, isTopPick: c.recommendationScore >= topScore - TOP_PICK_SCORE_MARGIN }));

    return { reasonCode: null, candidates };
  },

  // Re-run server-side at assign time — defends against a stale candidate list (vendor
  // went offline/got blocked/lost KYC between the admin fetching candidates and clicking
  // assign) rather than trusting whatever the UI submits.
  async assertVendorEligible(order, vendorId) {
    const { vendors } = await getEligibleVendors(order);
    const eligible = vendors.some((v) => String(v.vendorId) === String(vendorId));
    if (!eligible) {
      throw new ApiError(409, 'This vendor is no longer an eligible candidate for this order — refresh the candidate list and try again');
    }
  },
};
