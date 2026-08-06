// Standalone demo-data seed script for 10 demo Users (customers) + their Addresses.
// Run with: node scripts/seedUsers.js
//
// This does NOT wire into app startup. It connects to the same MongoDB the running app
// uses (config.DATABASE_URL / DB_NAME, exactly like scripts/seedRootAdmin.js and
// scripts/seedCatalog.js), and inserts fresh demo Users + Addresses via the real
// Mongoose models so their hooks run exactly as they do in the live app:
//   - User passwords are passed as PLAINTEXT to User.create() and hashed by the same
//     bcrypt pre('save') hook (src/plugins/withAuth.js) used by the real
//     /auth/register flow — this script never hashes passwords itself.
//   - Address.completeAddress is auto-built by Address's own pre('save') hook — this
//     script never sets it directly.
//
// Before inserting, it wipes only Users whose email matches THIS run's generated
// pattern (plus those users' Addresses) — it never touches unrelated existing
// accounts. Safe to re-run repeatedly during dev.
//
// Passwords are printed in PLAINTEXT to the console ONLY, for you to copy and log in
// with while testing — they are never stored in plaintext anywhere in the DB.

import mongoose from 'mongoose';
import config from '../src/config/config.js';
import { DB_NAME } from '../src/constants/constants.js';
import { User } from '../src/core/models/index.js';
import { Address } from '../src/features/address/models/address.model.js';

const maskConnectionString = (uri) => (uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : uri);

const randomRecentDate = (daysBack) =>
  new Date(Date.now() - Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000));

const placeholderAvatar = (seed) => ({
  key: `placeholder/${seed}`,
  url: 'https://placehold.co/200x200',
});

// Derives email/password from a full name per the fixed rule: lowercase(first+last),
// no spaces/punctuation, "@gmail.com" / "@123". Collisions (two names reducing to the
// same base) get a numeric suffix appended to BOTH email and password, so credentials
// stay paired and unique — never silently dropped or skipped.
const deriveCredentials = (firstName, lastName, usedEmails) => {
  const base = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z]/g, '');
  let local = base;
  let counter = 2;
  while (usedEmails.has(`${local}@gmail.com`)) {
    local = `${base}${counter}`;
    counter += 1;
  }
  const email = `${local}@gmail.com`;
  usedEmails.add(email);
  return { email, password: `${local}@123` };
};

// ─────────────────────────────────────────────────────────────────────────────
// Demo content — 10 realistic Indian customers, hand-curated (not procedurally
// generated) so names/addresses read as real. Cities are deliberately spread out;
// isEmailVerified / isBlocked / address-count are deliberately varied for test
// coverage (7/3 verified split, exactly one blocked user, mix of 1 vs 2 addresses).
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_USERS = [
  {
    firstName: 'Akash',
    lastName: 'Patel',
    phoneNumber: '9845123467',
    isEmailVerified: true,
    isBlocked: false,
    addresses: [
      {
        label: 'Home',
        street: 'Flat 402, Prestige Meridian Apartments, MG Road',
        landmark: 'Near Trinity Metro Station',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560001',
        geolocation: { lat: 12.9716, lng: 77.5946 },
      },
      {
        label: 'Work',
        street: '3rd Floor, RMZ Ecoworld, Outer Ring Road, Bellandur',
        landmark: 'Near Bellandur Signal',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560103',
        geolocation: { lat: 12.9716, lng: 77.5946 },
      },
    ],
  },
  {
    firstName: 'Priya',
    lastName: 'Sharma',
    phoneNumber: '8721345690',
    isEmailVerified: false,
    isBlocked: false,
    addresses: [
      {
        label: 'Home',
        street: 'B-1204, Lodha Heights, Kanjurmarg West',
        landmark: 'Near Kanjurmarg Railway Station',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400078',
        geolocation: { lat: 19.076, lng: 72.8777 },
      },
    ],
  },
  {
    firstName: 'Rahul',
    lastName: 'Verma',
    phoneNumber: '9934218765',
    isEmailVerified: true,
    isBlocked: false,
    addresses: [
      {
        label: 'Home',
        street: 'House No. 24, Pocket C, Hauz Khas Enclave',
        landmark: 'Near Hauz Khas Metro Station',
        city: 'Delhi',
        state: 'Delhi',
        pinCode: '110016',
        geolocation: { lat: 28.6139, lng: 77.209 },
      },
      {
        label: 'Work',
        street: '5th Floor, DLF Cyber Hub, Connaught Place',
        landmark: 'Near CP Metro Gate 6',
        city: 'Delhi',
        state: 'Delhi',
        pinCode: '110001',
        geolocation: { lat: 28.6139, lng: 77.209 },
      },
    ],
  },
  {
    firstName: 'Sneha',
    lastName: 'Reddy',
    phoneNumber: '7789456123',
    isEmailVerified: true,
    isBlocked: true, // deliberately the one blocked demo account, for testing the blocked-state badge/filter
    addresses: [
      {
        label: 'Home',
        street: 'Flat 8B, Kumar Pinnacle, Viman Nagar',
        landmark: 'Near Phoenix Marketcity',
        city: 'Pune',
        state: 'Maharashtra',
        pinCode: '411014',
        geolocation: { lat: 18.5204, lng: 73.8567 },
      },
    ],
  },
  {
    firstName: 'Arjun',
    lastName: 'Nair',
    phoneNumber: '8890123456',
    isEmailVerified: false,
    isBlocked: false,
    addresses: [
      {
        label: 'Home',
        street: 'Plot 56, Road No. 12, Banjara Hills',
        landmark: 'Near KBR Park',
        city: 'Hyderabad',
        state: 'Telangana',
        pinCode: '500034',
        geolocation: { lat: 17.385, lng: 78.4867 },
      },
      {
        label: 'Work',
        street: 'Block A, DivyaSree Orion, Gachibowli',
        landmark: 'Near Wipro Circle',
        city: 'Hyderabad',
        state: 'Telangana',
        pinCode: '500032',
        geolocation: { lat: 17.385, lng: 78.4867 },
      },
    ],
  },
  {
    firstName: 'Kavya',
    lastName: 'Iyer',
    phoneNumber: '9123456780',
    isEmailVerified: true,
    isBlocked: false,
    addresses: [
      {
        label: 'Home',
        street: 'New No. 17, 4th Cross Street, Besant Nagar',
        landmark: 'Near Adyar Bridge',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600020',
        geolocation: { lat: 13.0827, lng: 80.2707 },
      },
    ],
  },
  {
    firstName: 'Vikram',
    lastName: 'Singh',
    phoneNumber: '6789012345',
    isEmailVerified: true,
    isBlocked: false,
    addresses: [
      {
        label: 'Home',
        street: 'Flat 204, Brigade Meadows, HSR Layout',
        landmark: 'Near HSR BDA Complex',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560102',
        geolocation: { lat: 12.9716, lng: 77.5946 },
      },
      {
        label: 'Work',
        street: '2nd Floor, Manyata Tech Park, Nagawara',
        landmark: 'Near Manyata Gate 3',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560045',
        geolocation: { lat: 12.9716, lng: 77.5946 },
      },
    ],
  },
  {
    firstName: 'Ananya',
    lastName: 'Gupta',
    phoneNumber: '9456781230',
    isEmailVerified: false,
    isBlocked: false,
    addresses: [
      {
        label: 'Home',
        street: '3rd Floor, Silver Oak CHS, Linking Road, Bandra West',
        landmark: 'Near Bandra Bandstand',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400050',
        geolocation: { lat: 19.076, lng: 72.8777 },
      },
    ],
  },
  {
    firstName: 'Rohan',
    lastName: 'Mehta',
    phoneNumber: '8234567891',
    isEmailVerified: true,
    isBlocked: false,
    addresses: [
      {
        label: 'Home',
        street: 'C-45, Saket District Centre Road',
        landmark: 'Near Saket Metro Station',
        city: 'Delhi',
        state: 'Delhi',
        pinCode: '110017',
        geolocation: { lat: 28.6139, lng: 77.209 },
      },
      {
        label: 'Work',
        street: '6th Floor, DLF Tower, Nehru Place',
        landmark: 'Near Nehru Place Metro',
        city: 'Delhi',
        state: 'Delhi',
        pinCode: '110019',
        geolocation: { lat: 28.6139, lng: 77.209 },
      },
    ],
  },
  {
    firstName: 'Ishita',
    lastName: 'Joshi',
    phoneNumber: '7912345678',
    isEmailVerified: false,
    isBlocked: false,
    addresses: [
      {
        label: 'Home',
        street: 'Row House 12, Amanora Park Town, Hadapsar',
        landmark: 'Near Amanora Mall',
        city: 'Pune',
        state: 'Maharashtra',
        pinCode: '411028',
        geolocation: { lat: 18.5204, lng: 73.8567 },
      },
    ],
  },
];

const main = async () => {
  // Resolve credentials up front (pure, no DB) so the preview table and the actual
  // inserts always agree.
  const usedEmails = new Set();
  const plan = DEMO_USERS.map((u) => ({
    ...u,
    ...deriveCredentials(u.firstName, u.lastName, usedEmails),
  }));

  console.log('Generated name -> email -> password mappings:\n');
  console.table(
    plan.map((u) => ({
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      password: u.password,
      addresses: u.addresses.length,
      isEmailVerified: u.isEmailVerified,
      isBlocked: u.isBlocked,
    }))
  );

  console.log(`\nUsing DATABASE_URL from environment (masked): ${maskConnectionString(config.DATABASE_URL)}`);
  console.log(`Target database name: ${DB_NAME}\n`);

  const connection = await mongoose.connect(config.DATABASE_URL, { dbName: DB_NAME });
  console.log(`Connected. DB HOST: ${connection.connection.host}\n`);

  try {
    const generatedEmails = plan.map((u) => u.email);
    const existingMatches = await User.find({ email: { $in: generatedEmails } }).select('_id email');
    if (existingMatches.length > 0) {
      const matchedIds = existingMatches.map((u) => u._id);
      console.log(
        `Wiping ${existingMatches.length} pre-existing user(s) matching this run's generated emails (and their addresses)...`
      );
      await Address.deleteMany({ ownerType: 'User', owner: { $in: matchedIds } });
      await User.deleteMany({ _id: { $in: matchedIds } });
      console.log('Wiped.\n');
    } else {
      console.log("No existing users matched this run's generated emails — nothing to wipe.\n");
    }

    const expected = { users: 0, addresses: 0 };

    for (let i = 0; i < plan.length; i += 1) {
      const u = plan[i];
      console.log(`Creating user ${i + 1}/${plan.length}: ${u.firstName} ${u.lastName} (${u.email})...`);

      const user = await User.create({
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        password: u.password, // hashed by the withAuth pre('save') hook
        phoneNumber: u.phoneNumber,
        isEmailVerified: u.isEmailVerified,
        isActive: true,
        isBlocked: u.isBlocked,
        lastLoginAt: randomRecentDate(30),
        avatar: placeholderAvatar(u.email.split('@')[0]),
      });
      expected.users += 1;

      let defaultAddressId = null;
      for (let a = 0; a < u.addresses.length; a += 1) {
        const addr = u.addresses[a];
        const isDefault = a === 0;
        const address = await Address.create({
          ownerType: 'User',
          owner: user._id,
          label: addr.label,
          street: addr.street,
          landmark: addr.landmark,
          city: addr.city,
          state: addr.state,
          pinCode: addr.pinCode,
          geolocation: addr.geolocation,
          isDefault,
        });
        expected.addresses += 1;
        if (isDefault) defaultAddressId = address._id;
        console.log(`  Address added: ${addr.label} (${addr.city}) ${isDefault ? '[default]' : ''}`);
      }

      user.defaultAddress = defaultAddressId;
      await user.save();
    }

    console.log('\nSeed complete. Expected counts (created by this run):');
    console.table(expected);

    console.log('\nVerifying against actual database counts...');
    const [userCount, addressCount] = await Promise.all([
      User.countDocuments(),
      Address.countDocuments({ ownerType: 'User' }),
    ]);
    console.table({ users: userCount, addresses: addressCount });

    console.log('\nLogin credentials for the 10 demo users (passwords shown in PLAINTEXT here only —');
    console.log('never stored in plaintext in the DB):\n');
    console.table(
      plan.map((u) => ({
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        password: u.password,
      }))
    );
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
};

main().catch((err) => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});
