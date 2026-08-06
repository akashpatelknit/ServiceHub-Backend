/**
 * One-time backfill: stamp ownerType/owner (and isDefault, for array entries) onto
 * pre-existing Address documents that predate those fields.
 *
 * Reads the legacy `addresses` / `productDeliverAddress` arrays straight off the raw
 * `users` and `vendors` collections (not via the Mongoose models) because the User
 * schema no longer declares an `addresses` path — Mongoose would silently drop it
 * from query results otherwise.
 *
 * Idempotent: only touches Address docs that don't already have `owner` set.
 *
 * Usage:
 *   node src/migrations/001-backfill-address-owner.js --dry-run   # report only, no writes
 *   node src/migrations/001-backfill-address-owner.js             # apply
 */
import mongoose from 'mongoose';
import connectDB from '../db/index.js';
import { Address } from '../features/address/models/address.model.js';
import { Kyc } from '../features/auth/models/kyc.model.js';

const DRY_RUN = process.argv.includes('--dry-run');

const stampIfUnowned = async (addressId, ownerType, owner, isDefault, counters, label) => {
  if (!addressId) return;

  const address = await Address.findById(addressId);
  if (!address) {
    counters.missing += 1;
    return;
  }
  if (address.owner) {
    counters.alreadyOwned += 1;
    return;
  }

  counters[label] += 1;
  if (DRY_RUN) return;

  address.ownerType = ownerType;
  address.owner = owner;
  if (typeof isDefault === 'boolean') address.isDefault = isDefault;
  await address.save();
};

const run = async () => {
  await connectDB();

  const counters = { alreadyOwned: 0, missing: 0, fromKyc: 0, fromUserArray: 0, fromVendorArray: 0 };

  // 1. Vendor KYC submissions — info.address belongs to the submitting vendor.
  const kycDocs = await Kyc.find({ 'info.address': { $exists: true } }, { vendor: 1, 'info.address': 1 });
  for (const kyc of kycDocs) {
    await stampIfUnowned(kyc.info?.address, 'Vendor', kyc.vendor, undefined, counters, 'fromKyc');
  }

  // 2. Legacy embedded arrays — read straight off the raw collections.
  const usersCollection = mongoose.connection.db.collection('users');
  const userDocs = await usersCollection.find({ addresses: { $exists: true, $ne: [] } }, { projection: { addresses: 1 } }).toArray();
  for (const user of userDocs) {
    for (const entry of user.addresses || []) {
      await stampIfUnowned(entry.address, 'User', user._id, entry.isDefault, counters, 'fromUserArray');
    }
  }

  const vendorsCollection = mongoose.connection.db.collection('vendors');
  const vendorDocs = await vendorsCollection
    .find(
      { $or: [{ addresses: { $exists: true, $ne: [] } }, { productDeliverAddress: { $exists: true, $ne: [] } }] },
      { projection: { addresses: 1, productDeliverAddress: 1 } }
    )
    .toArray();
  for (const vendor of vendorDocs) {
    for (const entry of [...(vendor.addresses || []), ...(vendor.productDeliverAddress || [])]) {
      await stampIfUnowned(entry.address, 'Vendor', vendor._id, entry.isDefault, counters, 'fromVendorArray');
    }
  }

  // 3. Report anything left unowned — no signal to infer ownership from, so left untouched.
  const orphans = await Address.find({ owner: { $exists: false } }, { _id: 1 });

  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Backfill summary:`);
  console.log(`  Already owned (skipped): ${counters.alreadyOwned}`);
  console.log(`  Backfilled from KYC:     ${counters.fromKyc}`);
  console.log(`  Backfilled from User[]:  ${counters.fromUserArray}`);
  console.log(`  Backfilled from Vendor[]:${counters.fromVendorArray}`);
  console.log(`  Referenced but missing:  ${counters.missing}`);
  console.log(`  Orphans (no owner found):${orphans.length}${orphans.length ? ' — ' + orphans.map((o) => o._id).join(', ') : ''}`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
