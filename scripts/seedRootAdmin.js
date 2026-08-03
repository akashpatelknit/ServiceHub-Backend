// One-off CLI script to provision the first SUPER_ADMIN account.
// There is no HTTP endpoint that creates an Admin (see docs/features/auth.md) —
// admins are provisioned out-of-band, which is what this script is for.
//
// Usage:
//   node scripts/seedRootAdmin.js --email you@example.com --username rootadmin [--firstName Root] [--lastName Admin]
//
// The password is randomly generated and printed ONCE — it is not recoverable afterwards
// (only its bcrypt hash is stored), so copy it immediately and change it after first login
// via PATCH /api/v1/auth/admin/change-password.

import crypto from 'node:crypto';
import mongoose from 'mongoose';
import config from '../src/config/config.js';
import { DB_NAME } from '../src/constants/constants.js';
import { Admin } from '../src/core/models/index.js';
import { ADMIN_SUB_ROLES } from '../src/features/auth/constants/permissions.constants.js';

const parseArgs = () => {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
};

const generatePassword = () => crypto.randomBytes(18).toString('base64url'); // ~24 chars, URL-safe

const main = async () => {
  const args = parseArgs();

  const email = (args.email ?? '').trim().toLowerCase();
  const username = (args.username ?? 'rootadmin').trim().toLowerCase();
  const firstName = args.firstName ?? 'Root';
  const lastName = args.lastName ?? 'Admin';

  if (!email) {
    console.error('Missing required --email=<address>. Example:');
    console.error('  node scripts/seedRootAdmin.js --email you@example.com --username rootadmin');
    process.exit(1);
  }

  await mongoose.connect(config.DATABASE_URL, { dbName: DB_NAME });

  try {
    const existing = await Admin.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      console.error(
        `An admin already exists with email "${existing.email}" or username "${existing.username}" (_id: ${existing._id}). Aborting — not overwriting.`
      );
      process.exit(1);
    }

    const password = generatePassword();

    const admin = await Admin.create({
      username,
      email,
      firstName,
      lastName,
      password, // hashed by the withAuth pre('save') hook
      subRole: ADMIN_SUB_ROLES.SUPER_ADMIN,
    });

    console.log('\nRoot admin created:');
    console.log(`  _id:      ${admin._id}`);
    console.log(`  username: ${admin.username}`);
    console.log(`  email:    ${admin.email}`);
    console.log(`  subRole:  ${admin.subRole}`);
    console.log(`  password: ${password}`);
    console.log('\nThis password is shown only once (only its hash is stored). Save it now,');
    console.log('and change it after first login via PATCH /api/v1/auth/admin/change-password.\n');
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((err) => {
  console.error('Failed to create root admin:', err);
  process.exit(1);
});
