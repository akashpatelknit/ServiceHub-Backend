// Standalone demo-data seed script for the admin "Assign Vendor" feature
// (features/service-booking's vendor-candidates endpoint). Run with:
//   node scripts/seedVendorAssignment.js
//
// Connects to the same MongoDB the running app uses (config.DATABASE_URL / DB_NAME,
// same as seedUsers.js/seedOrders.js/seedCatalog.js) and inserts via the real Mongoose
// models so every schema hook and the real orderNumber Counter sequence run exactly as
// they do in the live app.
//
// Requires (run these first if missing):
//   - node scripts/seedCatalog.js   — at least a handful of active CatalogServices
//   - node scripts/seedUsers.js     — at least one User (the customer on the demo orders)
//
// KYC is a hard gate in VendorCandidateService (features/service-booking) separate from
// anything on the Vendor document itself — a vendor with isVerified/isAvailable all
// correct but no `Kyc` doc at status 'verified' will NEVER show up as a candidate. This
// script seeds a minimal Kyc doc for every 'active' vendor for exactly that reason.
//
// Wipes, every run:
//   - ALL Vendor documents (and the Kyc docs that reference them) — this script owns
//     vendor demo data end-to-end, per the explicit brief for this script.
//   - ALL CatalogVendorService documents (same reasoning).
//   - Only ITS OWN ServiceOrders, identified by addressSnapshot.label ===
//     SEED_ORDER_LABEL — never touches seedOrders.js's demo orders or real orders for
//     the same customer.

import mongoose from 'mongoose';
import config from '../src/config/config.js';
import { DB_NAME } from '../src/constants/constants.js';
import { Vendor, User } from '../src/core/models/index.js';
import { Service as CatalogService, VendorService as CatalogVendorService } from '../src/features/service-catalog/models/index.js';
import { VENDOR_SERVICE_STATUS } from '../src/features/service-catalog/constants/catalog.constants.js';
import { Kyc } from '../src/features/auth/models/kyc.model.js';
import { KYC_STATUS } from '../src/features/auth/constants/kyc.constants.js';
import { CustomerOrder } from '../src/features/order-core/index.js';
import { ServiceOrder } from '../src/features/service-booking/index.js';

const maskConnectionString = (uri) => (uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : uri);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randomInt(0, arr.length - 1)];
const minutesAgo = (n) => new Date(Date.now() - n * 60 * 1000);
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const hoursAfter = (date, h) => new Date(date.getTime() + h * 60 * 60 * 1000);

const SEED_ORDER_LABEL = 'SEED_VENDOR_ASSIGN_DEMO';
const SCHEDULED_SLOTS = ['9:00 AM - 11:00 AM', '11:00 AM - 1:00 PM', '2:00 PM - 4:00 PM', '4:00 PM - 6:00 PM'];

// Real Bengaluru neighborhoods, ~5-14km apart (verified via haversine before writing
// this) — close enough that mid-radius vendors sometimes cross clusters, far enough
// that tight-radius vendors never do. That spread is what makes the "distance relative
// to own serviceRadius" scoring actually have cases to differentiate.
const CLUSTERS = {
  koramangala: { name: 'Koramangala', lat: 12.9352, lng: 77.6245, pincode: '560034' },
  whitefield: { name: 'Whitefield', lat: 12.9698, lng: 77.75, pincode: '560066' },
  indiranagar: { name: 'Indiranagar', lat: 12.9784, lng: 77.6408, pincode: '560038' },
};

// ~±1.5km jitter at this latitude, so vendors in the same cluster aren't literally
// stacked on one point.
const jitteredPoint = (clusterKey) => {
  const c = CLUSTERS[clusterKey];
  return { lat: c.lat + (Math.random() - 0.5) * 0.03, lng: c.lng + (Math.random() - 0.5) * 0.03 };
};

// ── Vendor plan — 18 vendors, hand-tuned (not procedurally random on the dimensions
// that matter) so every eligibility/ranking case in the brief is guaranteed to exist,
// not just probable:
//   - status: 13 active / 3 pending / 1 blocked / 1 suspended
//   - all 4 (isAvailable, isOnline) combinations represented more than once
//   - serviceRadius spans 3-25km, including a couple of wide-radius vendors deliberately
//     placed in Whitefield/Indiranagar so they can (barely, or comfortably) reach a
//     Koramangala order — the case that actually exercises cross-cluster eligibility
//   - `richFor`/`ordinaryFor` mark which vendors get a forced-approved mapping to the
//     services the demo orders target, so the "rich candidate list" / "in-between" test
//     orders have a guaranteed outcome instead of depending on random mapping luck
// ── ────────────────────────────────────────────────────────────────────────────────
const VENDOR_PLAN = [
  // Koramangala (7)
  { firstName: 'Manoj', lastName: 'Kumar', cluster: 'koramangala', status: 'active', serviceRadius: 8, isAvailable: true, isOnline: true, emailVerified: true, mobileVerified: true, hasEmail: true, richFor: 'rich', workload: 5 },
  { firstName: 'Divya', lastName: 'Rao', cluster: 'koramangala', status: 'active', serviceRadius: 5, isAvailable: true, isOnline: true, emailVerified: true, mobileVerified: true, hasEmail: true, richFor: 'rich', workload: 2 },
  { firstName: 'Suresh', lastName: 'Babu', cluster: 'koramangala', status: 'active', serviceRadius: 20, isAvailable: true, isOnline: false, emailVerified: true, mobileVerified: false, hasEmail: false, richFor: 'rich', workload: 1 },
  { firstName: 'Latha', lastName: 'Menon', cluster: 'koramangala', status: 'active', serviceRadius: 3, isAvailable: false, isOnline: true, emailVerified: true, mobileVerified: true, hasEmail: true },
  { firstName: 'Farhan', lastName: 'Sheikh', cluster: 'koramangala', status: 'pending', serviceRadius: 10, isAvailable: true, isOnline: true, emailVerified: false, mobileVerified: true, hasEmail: true },
  { firstName: 'Neha', lastName: 'Kulkarni', cluster: 'koramangala', status: 'blocked', serviceRadius: 12, isAvailable: true, isOnline: false, emailVerified: true, mobileVerified: true, hasEmail: true },
  { firstName: 'Rakesh', lastName: 'Pillai', cluster: 'koramangala', status: 'active', serviceRadius: 15, isAvailable: false, isOnline: false, emailVerified: true, mobileVerified: true, hasEmail: true },

  // Whitefield (6)
  { firstName: 'Anitha', lastName: 'Shetty', cluster: 'whitefield', status: 'active', serviceRadius: 6, isAvailable: true, isOnline: true, emailVerified: true, mobileVerified: true, hasEmail: true, ordinaryFor: 'ordinary1' },
  { firstName: 'Deepak', lastName: 'Joshi', cluster: 'whitefield', status: 'active', serviceRadius: 25, isAvailable: true, isOnline: true, emailVerified: true, mobileVerified: true, hasEmail: true, ordinaryFor: 'ordinary1' },
  { firstName: 'Meera', lastName: 'Krishnan', cluster: 'whitefield', status: 'active', serviceRadius: 9, isAvailable: true, isOnline: false, emailVerified: false, mobileVerified: true, hasEmail: false },
  { firstName: 'Vivek', lastName: 'Anand', cluster: 'whitefield', status: 'pending', serviceRadius: 12, isAvailable: true, isOnline: true, emailVerified: true, mobileVerified: true, hasEmail: true },
  { firstName: 'Pooja', lastName: 'Malhotra', cluster: 'whitefield', status: 'active', serviceRadius: 4, isAvailable: false, isOnline: true, emailVerified: true, mobileVerified: true, hasEmail: true },
  { firstName: 'Sandeep', lastName: 'Chauhan', cluster: 'whitefield', status: 'suspended', serviceRadius: 18, isAvailable: true, isOnline: true, emailVerified: true, mobileVerified: true, hasEmail: true },

  // Indiranagar (5)
  { firstName: 'Ramesh', lastName: 'Iyer', cluster: 'indiranagar', status: 'active', serviceRadius: 7, isAvailable: true, isOnline: true, emailVerified: true, mobileVerified: true, hasEmail: true, ordinaryFor: 'ordinary2' },
  { firstName: 'Swathi', lastName: 'Prasad', cluster: 'indiranagar', status: 'active', serviceRadius: 22, isAvailable: true, isOnline: false, emailVerified: true, mobileVerified: true, hasEmail: true, richFor: 'rich', workload: 0 },
  { firstName: 'Imran', lastName: 'Qureshi', cluster: 'indiranagar', status: 'active', serviceRadius: 5, isAvailable: true, isOnline: true, emailVerified: false, mobileVerified: false, hasEmail: true, ordinaryFor: 'ordinary2' },
  { firstName: 'Geetha', lastName: 'Subramaniam', cluster: 'indiranagar', status: 'pending', serviceRadius: 8, isAvailable: false, isOnline: false, emailVerified: true, mobileVerified: true, hasEmail: true },
  { firstName: 'Arvind', lastName: 'Bhat', cluster: 'indiranagar', status: 'active', serviceRadius: 14, isAvailable: true, isOnline: true, emailVerified: true, mobileVerified: true, hasEmail: true, richFor: 'rich', workload: 0 },
];

// status only drives admin-panel display directly — isVerified/isBlocked are what the
// eligibility filter actually reads, and per adminVendor.service.js's setStatus() only
// 'active' sets isVerified true, and only 'blocked' sets isBlocked true (mirrors
// CoreAccessor.setBlocked). Reproduced here since this script bypasses that service.
const deriveStatusFields = (status) => ({
  isVerified: status === 'active',
  isBlocked: status === 'blocked',
});

const derivePhoneNumbers = (count) => {
  const used = new Set();
  const numbers = [];
  while (numbers.length < count) {
    const n = `9${randomInt(100000000, 999999999)}`;
    if (used.has(n)) continue;
    used.add(n);
    numbers.push(n);
  }
  return numbers;
};

const resolveCustomer = async () => {
  const seedUserEmail = process.env.SEED_USER_EMAIL || '';
  if (seedUserEmail) {
    const user = await User.findOne({ email: seedUserEmail });
    if (!user) throw new Error(`SEED_USER_EMAIL="${seedUserEmail}" does not match any User document.`);
    return user;
  }
  const user = await User.findOne().sort({ createdAt: 1 });
  if (!user) {
    throw new Error(
      'No User document found and SEED_USER_EMAIL is not set. Run `node scripts/seedUsers.js` first, then re-run this script.'
    );
  }
  return user;
};

const buildAddressSnapshot = (clusterKey, streetText) => {
  const cluster = CLUSTERS[clusterKey];
  return {
    fullAddress: `${streetText}, ${cluster.name}, Bengaluru`,
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: cluster.pincode,
    geolocation: jitteredPoint(clusterKey),
    label: SEED_ORDER_LABEL,
  };
};

const buildServiceItem = (service) => ({
  serviceId: service._id,
  serviceNameSnapshot: service.name,
  priceSnapshot: service.price,
  durationSnapshot: service.durationMins,
  addonsSnapshot: [],
});

// Picks 2-6 distinct services for a vendor's mapping set. `forcedApprovedService`, when
// given, is always included with status 'approved' — that's what guarantees the demo
// orders' candidate lists come out rich/ordinary/empty as designed rather than by luck.
const buildMappingPlan = (pool, forcedApprovedService) => {
  const count = randomInt(2, 6);
  const chosen = new Map();
  if (forcedApprovedService) {
    chosen.set(String(forcedApprovedService._id), { service: forcedApprovedService, status: VENDOR_SERVICE_STATUS.APPROVED });
  }
  let attempts = 0;
  while (chosen.size < count && attempts < 50) {
    attempts += 1;
    const svc = pick(pool);
    if (chosen.has(String(svc._id))) continue;
    const status = Math.random() < 0.8 ? VENDOR_SERVICE_STATUS.APPROVED : pick([VENDOR_SERVICE_STATUS.PENDING, VENDOR_SERVICE_STATUS.REJECTED]);
    chosen.set(String(svc._id), { service: svc, status });
  }
  return [...chosen.values()];
};

const main = async () => {
  console.log(`Using DATABASE_URL from environment (masked): ${maskConnectionString(config.DATABASE_URL)}`);
  console.log(`Target database name: ${DB_NAME}\n`);

  const connection = await mongoose.connect(config.DATABASE_URL, { dbName: DB_NAME });
  console.log(`Connected. DB HOST: ${connection.connection.host}\n`);

  try {
    const customer = await resolveCustomer();
    console.log(`Demo orders will belong to customer: ${customer.firstName} ${customer.lastName} <${customer.email}> (_id ${customer._id})\n`);

    const services = await CatalogService.find({ isActive: true }).limit(60).lean();
    if (services.length < 4) {
      throw new Error('Fewer than 4 active CatalogService documents found. Run `node scripts/seedCatalog.js` first.');
    }

    const richService = services.find((s) => /ac repair/i.test(s.name)) || services[0];
    const remaining = services.filter((s) => String(s._id) !== String(richService._id));
    const emptyService = remaining[0];
    const ordinaryService1 = remaining[1] || remaining[0];
    const ordinaryService2 = remaining[2] || remaining[0];
    // Everything except emptyService — that exclusion is what guarantees it stays at
    // zero approved mappings no matter what random assignment does elsewhere.
    const mappablePool = services.filter((s) => String(s._id) !== String(emptyService._id));

    console.log('Service roles for this demo run:');
    console.table({
      richService: richService.name,
      emptyService: emptyService.name,
      ordinaryService1: ordinaryService1.name,
      ordinaryService2: ordinaryService2.name,
    });

    // ── Wipe ──────────────────────────────────────────────────────────────────
    const existingVendorIds = (await Vendor.find().select('_id')).map((v) => v._id);
    console.log(`\nWiping ${existingVendorIds.length} existing Vendor doc(s), their Kyc docs, and all CatalogVendorService docs...`);
    await Promise.all([
      Kyc.deleteMany({ vendor: { $in: existingVendorIds } }),
      CatalogVendorService.deleteMany({}),
      Vendor.deleteMany({}),
    ]);
    const wipedOrders = await ServiceOrder.deleteMany({ 'addressSnapshot.label': SEED_ORDER_LABEL });
    console.log(`Wiped. Also removed ${wipedOrders.deletedCount} of this script's own ServiceOrder(s) from a previous run.\n`);

    // ── Vendors ───────────────────────────────────────────────────────────────
    console.log(`Creating ${VENDOR_PLAN.length} vendors...`);
    const phoneNumbers = derivePhoneNumbers(VENDOR_PLAN.length);
    const createdVendors = [];

    for (const [i, plan] of VENDOR_PLAN.entries()) {
      const { isVerified, isBlocked } = deriveStatusFields(plan.status);
      const vendor = await Vendor.create({
        firstName: plan.firstName,
        lastName: plan.lastName,
        phoneNumber: phoneNumbers[i],
        email: plan.hasEmail ? `${plan.firstName}.${plan.lastName}@example.com`.toLowerCase() : undefined,
        status: plan.status,
        isVerified,
        isBlocked,
        blockReason: plan.status === 'blocked' ? 'Repeated no-shows reported by customers' : undefined,
        isEmailVerified: plan.emailVerified,
        isMobileVerified: plan.mobileVerified,
        serviceRadius: plan.serviceRadius,
        isAvailable: plan.isAvailable,
        isOnline: plan.isOnline,
        lastSeen: plan.isOnline ? minutesAgo(randomInt(1, 20)) : daysAgo(randomInt(1, 8)),
        currentLocation: (() => {
          const { lat, lng } = jitteredPoint(plan.cluster);
          return { type: 'Point', coordinates: [lng, lat] };
        })(),
      });
      createdVendors.push({ vendor, plan });
      console.log(`  ${vendor.firstName} ${vendor.lastName} — ${plan.cluster}, status=${plan.status}, radius=${plan.serviceRadius}km, available=${plan.isAvailable}, online=${plan.isOnline}`);
    }

    // ── Kyc — only for 'active' vendors; this is the gate the brief didn't mention but
    // the real eligibility filter requires (see file header comment). ──────────────
    console.log('\nCreating Kyc (verified) for active vendors...');
    const activeVendors = createdVendors.filter(({ plan }) => plan.status === 'active');
    await Kyc.insertMany(activeVendors.map(({ vendor }) => ({ vendor: vendor._id, status: KYC_STATUS.VERIFIED })));
    console.log(`  ${activeVendors.length} Kyc doc(s) created (status='${KYC_STATUS.VERIFIED}').\n`);

    // ── VendorServiceMappings ─────────────────────────────────────────────────
    console.log('Creating VendorServiceMappings...');
    let mappingCount = 0;
    for (const { vendor, plan } of createdVendors) {
      const forcedService = plan.richFor === 'rich' ? richService : plan.ordinaryFor === 'ordinary1' ? ordinaryService1 : plan.ordinaryFor === 'ordinary2' ? ordinaryService2 : null;
      const mappingPlan = buildMappingPlan(mappablePool, forcedService);
      await CatalogVendorService.insertMany(
        mappingPlan.map((entry) => ({
          vendor: vendor._id,
          service: entry.service._id,
          status: entry.status,
          requestedAt: daysAgo(randomInt(2, 40)),
          reviewedAt: entry.status === VENDOR_SERVICE_STATUS.PENDING ? null : daysAgo(randomInt(1, 30)),
        }))
      );
      mappingCount += mappingPlan.length;
    }
    console.log(`  ${mappingCount} mapping(s) created across ${createdVendors.length} vendors.\n`);

    // ── Workload — pre-existing assigned/in-progress ServiceOrders for some vendors ──
    console.log('Creating workload ServiceOrders (assigned/in-progress) for scoring variation...');
    const workloadVendors = createdVendors.filter(({ plan }) => plan.workload > 0);
    let workloadOrderCount = 0;
    for (const { vendor, plan } of workloadVendors) {
      for (let j = 0; j < plan.workload; j += 1) {
        const service = pick(services);
        const item = buildServiceItem(service);
        const orderNumber = await CustomerOrder.generateOrderNumber('SRV');
        const createdAt = daysAgo(randomInt(1, 10));
        await ServiceOrder.create({
          orderNumber,
          user: customer._id,
          paymentStatus: 'paid',
          totalAmount: item.priceSnapshot,
          addressSnapshot: buildAddressSnapshot(plan.cluster, 'Workload demo address'),
          items: [item],
          scheduledDate: daysFromNow(randomInt(0, 3)),
          scheduledSlot: pick(SCHEDULED_SLOTS),
          assignedVendor: vendor._id,
          status: pick(['assigned', 'in-progress']),
          statusHistory: [
            { status: 'confirmed', changedAt: createdAt, changedBy: customer._id, changedByModel: 'User' },
            { status: 'assigned', changedAt: hoursAfter(createdAt, 2), changedBy: null, changedByModel: 'Admin' },
          ],
        });
        workloadOrderCount += 1;
      }
      console.log(`  ${vendor.firstName} ${vendor.lastName}: ${plan.workload} active job(s)`);
    }
    console.log(`  ${workloadOrderCount} workload ServiceOrder(s) created.\n`);

    // ── Target ServiceOrders — the ones to actually click "Assign Vendor" on ────────
    console.log('Creating target ServiceOrders (status=confirmed, unassigned)...');
    const targetPlans = [
      { label: 'Rich candidate list', cluster: 'koramangala', service: richService, street: 'Flat 12A, Sunrise Apartments' },
      { label: 'Zero eligible vendors (no approved mapping)', cluster: 'koramangala', service: emptyService, street: 'Villa 4, Palm Meadows' },
      { label: 'Ordinary case — Whitefield', cluster: 'whitefield', service: ordinaryService1, street: 'B-702, ITPL Residency' },
      { label: 'Ordinary case — Indiranagar', cluster: 'indiranagar', service: ordinaryService2, street: '2nd Cross, Defence Colony' },
    ];

    const targetOrders = [];
    for (const t of targetPlans) {
      const item = buildServiceItem(t.service);
      const orderNumber = await CustomerOrder.generateOrderNumber('SRV');
      const createdAt = daysAgo(1);
      const order = await ServiceOrder.create({
        orderNumber,
        user: customer._id,
        paymentStatus: 'paid',
        totalAmount: item.priceSnapshot,
        addressSnapshot: buildAddressSnapshot(t.cluster, t.street),
        items: [item],
        scheduledDate: daysFromNow(randomInt(1, 4)),
        scheduledSlot: pick(SCHEDULED_SLOTS),
        assignedVendor: null,
        status: 'confirmed',
        statusHistory: [
          { status: 'pending', changedAt: createdAt, changedBy: customer._id, changedByModel: 'User' },
          { status: 'confirmed', changedAt: hoursAfter(createdAt, 1), changedBy: null, changedByModel: 'System' },
        ],
      });
      targetOrders.push({ order, scenario: t.label, service: t.service.name });
      console.log(`  ${order.orderNumber} — ${t.label} (${t.service.name})`);
    }

    console.log('\nSeed complete. Expected counts (created by this run):');
    console.table({
      vendors: createdVendors.length,
      kycDocs: activeVendors.length,
      vendorServiceMappings: mappingCount,
      workloadOrders: workloadOrderCount,
      targetOrders: targetOrders.length,
    });

    console.log('\nVerifying against actual database counts...');
    const [vendorCount, kycCount, mappingActual, seedOrderCount] = await Promise.all([
      Vendor.countDocuments(),
      Kyc.countDocuments({ status: KYC_STATUS.VERIFIED, vendor: { $in: activeVendors.map(({ vendor }) => vendor._id) } }),
      CatalogVendorService.countDocuments(),
      ServiceOrder.countDocuments({ 'addressSnapshot.label': SEED_ORDER_LABEL }),
    ]);
    console.table({ vendors: vendorCount, verifiedKyc: kycCount, vendorServiceMappings: mappingActual, seedLabeledOrders: seedOrderCount });

    const expectedSeedOrders = workloadOrderCount + targetOrders.length;
    if (vendorCount !== createdVendors.length || kycCount !== activeVendors.length || mappingActual !== mappingCount || seedOrderCount !== expectedSeedOrders) {
      console.error('\nMISMATCH detected against expected counts — investigate before trusting this data.');
      process.exitCode = 1;
    } else {
      console.log('\nAll actual database counts match expected counts. Seed verified.');
    }

    console.log('\nReady to test — open "Assign Vendor" on these ServiceOrders:');
    console.table(targetOrders.map(({ order, scenario, service }) => ({ orderNumber: order.orderNumber, scenario, service })));
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
};

main().catch((err) => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});
