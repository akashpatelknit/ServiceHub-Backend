/**
 * One-time backfill: derive the new Vendor.status enum for pre-existing vendors from
 * their existing isBlocked/isVerified booleans (status didn't exist before this
 * migration — every vendor currently reads the schema default 'pending').
 *
 * Rule: isBlocked -> 'blocked'; else isVerified -> 'active'; else 'pending'.
 * 'suspended' is never assigned here — it has no prior signal to derive from and only
 * becomes reachable going forward via an admin action.
 *
 * Idempotent: only touches vendors that don't already have a status field stored;
 * running it twice is a no-op the second time. Reads with .lean() deliberately — a
 * plain (hydrated) find() would have Mongoose apply the schema's 'pending' default to
 * any document missing the field in memory, making it indistinguishable from a vendor
 * that's genuinely already been backfilled to 'pending', and this script would then
 * silently skip writing the field to MongoDB at all.
 *
 * Usage:
 *   node src/migrations/002-backfill-vendor-status.js --dry-run   # report only, no writes
 *   node src/migrations/002-backfill-vendor-status.js             # apply
 */
import mongoose from 'mongoose';
import connectDB from '../db/index.js';
import { Vendor } from '../core/models/vendor.model.js';

const DRY_RUN = process.argv.includes('--dry-run');

const deriveStatus = (vendor) => {
  if (vendor.isBlocked) return 'blocked';
  if (vendor.isVerified) return 'active';
  return 'pending';
};

const run = async () => {
  await connectDB();

  const counters = { alreadyCorrect: 0, toBlocked: 0, toActive: 0, toPending: 0 };

  const vendors = await Vendor.find({}, { isBlocked: 1, isVerified: 1, status: 1 }).lean();

  for (const vendor of vendors) {
    // A stored 'status' key at all (regardless of value) means a prior run of this
    // migration already handled this vendor going forward, status changes only ever
    // happen through the admin status-change endpoint, not this one-off script.
    if (vendor.status !== undefined) {
      counters.alreadyCorrect += 1;
      continue;
    }

    const target = deriveStatus(vendor);
    if (target === 'blocked') counters.toBlocked += 1;
    else if (target === 'active') counters.toActive += 1;
    else counters.toPending += 1;

    if (DRY_RUN) continue;

    await Vendor.updateOne({ _id: vendor._id }, { $set: { status: target } });
  }

  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Vendor status backfill summary (${vendors.length} vendors scanned):`);
  console.log(`  Already correct: ${counters.alreadyCorrect}`);
  console.log(`  Set to blocked:  ${counters.toBlocked}`);
  console.log(`  Set to active:   ${counters.toActive}`);
  console.log(`  Set to pending:  ${counters.toPending}`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
