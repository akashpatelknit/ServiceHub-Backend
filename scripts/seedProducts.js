// Standalone demo-data seed script for the product catalog: ProductCategory + Product
// (features/product-catalog). Run with: node scripts/seedProducts.js
//
// This does NOT wire into app startup. It connects to the same MongoDB the running app
// uses (config.DATABASE_URL / DB_NAME, exactly like scripts/seedCatalog.js), wipes only
// the ProductCategory and Product collections, and inserts fresh demo data via the real
// Mongoose models so their hooks (slug generation, discount calculation) run exactly as
// they do in the live app.
//
// Requires an existing Admin document to use as ProductCategory's createdBy (there is
// no seed data for Admin — provision one first via `node scripts/seedRootAdmin.js
// --email ... --username ...` if none exists yet). Optionally pin a specific admin with:
//   SEED_ADMIN_ID=<adminObjectId> node scripts/seedProducts.js
// Otherwise falls back to the oldest existing Admin document.
//
// scripts/seedOrders.js depends on this having been run at least once (it reads
// whatever Products exist rather than seeding its own).

import mongoose from 'mongoose';
import config from '../src/config/config.js';
import { DB_NAME } from '../src/constants/constants.js';
import { Admin } from '../src/core/models/index.js';
import { ProductCategory } from '../src/features/product-catalog/models/productCategory.model.js';
import { Product } from '../src/models/product.model.js';

const maskConnectionString = (uri) => (uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : uri);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomIsActive = () => Math.random() < 0.9;

const placeholderImages = (seed) => ({
  productImages: [`https://placehold.co/400x300?text=${encodeURIComponent(seed)}`],
  images: [{ url: `https://placehold.co/400x300?text=${encodeURIComponent(seed)}`, altText: seed, isMainImage: true }],
});

// ─────────────────────────────────────────────────────────────────────────────
// Curated content — hand-written names/descriptions for realism, matching the
// "Native Smart Products" brand voice already used in seedCatalog.js's service
// catalog (services to install/service these devices already exist there; these are
// the sellable devices themselves).
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCT_CATEGORIES = [
  {
    name: 'Smart Water Purifiers',
    description: 'RO/UV/UF water purifiers with app-based filter alerts and smart monitoring.',
    products: [
      {
        name: 'Native RO+UV+UF Smart Water Purifier',
        sku: 'NTV-WP-001',
        price: 12999,
        stock: 40,
        shortDescription: '7-stage smart water purifier with app-based filter alerts.',
      },
      {
        name: 'Native Alkaline RO Water Purifier',
        sku: 'NTV-WP-002',
        price: 15999,
        stock: 25,
        shortDescription: 'Alkaline mineral RO purifier with pH balancing technology.',
      },
      {
        name: 'Native Copper RO Water Purifier',
        sku: 'NTV-WP-003',
        price: 13499,
        stock: 30,
        shortDescription: 'RO purifier with a copper infusion chamber for immunity-boosting water.',
      },
      {
        name: 'Native Compact Under-Sink RO Purifier',
        sku: 'NTV-WP-004',
        price: 9999,
        stock: 18,
        shortDescription: 'Space-saving under-sink RO unit, ideal for compact kitchens.',
      },
    ],
  },
  {
    name: 'Smart Locks & Security',
    description: 'Fingerprint, PIN, and camera-enabled smart locks and video doorbells.',
    products: [
      {
        name: 'Native Fingerprint Smart Door Lock',
        sku: 'NTV-SL-001',
        price: 8999,
        stock: 25,
        shortDescription: 'Fingerprint, PIN and app-unlock smart door lock with 1-year warranty.',
      },
      {
        name: 'Native PIN + Card Smart Door Lock',
        sku: 'NTV-SL-002',
        price: 7499,
        stock: 22,
        shortDescription: 'PIN code and RFID card entry with tamper-alert notifications.',
      },
      {
        name: 'Native Smart Lock with Camera',
        sku: 'NTV-SL-003',
        price: 11999,
        stock: 15,
        shortDescription: 'Smart lock with a built-in peephole camera and visitor log.',
      },
      {
        name: 'Native Smart Video Doorbell',
        sku: 'NTV-SL-004',
        price: 4499,
        stock: 35,
        shortDescription: 'HD video doorbell with night vision and two-way audio.',
      },
    ],
  },
  {
    name: 'Lighting & Décor',
    description: 'LED strip, cove, and decorative smart lighting for indoor and outdoor use.',
    products: [
      {
        name: 'Native LED Cove Light Kit (5m)',
        sku: 'NTV-LT-001',
        price: 1499,
        stock: 80,
        shortDescription: 'Warm/cool white LED strip kit with driver box, app-controllable.',
      },
      {
        name: 'Native Smart LED Strip Light (RGB, 5m)',
        sku: 'NTV-LT-002',
        price: 1999,
        stock: 70,
        shortDescription: '16-million-colour RGB strip with music sync and app/remote control.',
      },
      {
        name: 'Native Smart Chandelier Light',
        sku: 'NTV-LT-003',
        price: 5999,
        stock: 20,
        shortDescription: 'Dimmable smart chandelier with adjustable colour temperature.',
      },
      {
        name: 'Native Solar Garden String Lights',
        sku: 'NTV-LT-004',
        price: 1299,
        stock: 45,
        shortDescription: 'Weatherproof solar-powered string lights for gardens and balconies.',
      },
    ],
  },
  {
    name: 'Smart Appliances',
    description: 'Fans, air purifiers, and water heaters with smart controls.',
    products: [
      {
        name: 'Native Smart Ceiling Fan (BLDC)',
        sku: 'NTV-AP-001',
        price: 4999,
        stock: 28,
        shortDescription: 'Energy-efficient BLDC motor fan with remote and app control.',
      },
      {
        name: 'Native Wall-Mount Exhaust Fan (8 inch)',
        sku: 'NTV-AP-002',
        price: 1899,
        stock: 60,
        shortDescription: 'Low-noise wall exhaust fan with rust-proof blades.',
      },
      {
        name: 'Native Smart Air Purifier',
        sku: 'NTV-AP-003',
        price: 8499,
        stock: 20,
        shortDescription: 'HEPA + activated carbon air purifier with real-time AQI display.',
      },
      {
        name: 'Native Smart Geyser (15L)',
        sku: 'NTV-AP-004',
        price: 7999,
        stock: 24,
        shortDescription: 'App-controlled instant geyser with scheduled heating.',
      },
    ],
  },
  {
    name: 'Home Automation Accessories',
    description: 'Sensors, plugs, and hubs that tie smart home devices together.',
    products: [
      {
        name: 'Native Water Tank Sensor Kit',
        sku: 'NTV-HA-001',
        price: 2299,
        stock: 50,
        shortDescription: 'Ultrasonic tank-level sensor with app alerts for overflow/low water.',
      },
      {
        name: 'Native Smart Plug (WiFi, 16A)',
        sku: 'NTV-HA-002',
        price: 899,
        stock: 100,
        shortDescription: 'WiFi smart plug with energy monitoring and voice assistant support.',
      },
      {
        name: 'Native Smart Curtain Motor',
        sku: 'NTV-HA-003',
        price: 6499,
        stock: 16,
        shortDescription: 'Retrofit motorized curtain track opener with app/remote control.',
      },
      {
        name: 'Native Smart IR Blaster (Universal Remote Hub)',
        sku: 'NTV-HA-004',
        price: 1799,
        stock: 55,
        shortDescription: 'Control every IR appliance in the house from one app.',
      },
    ],
  },
];

const resolveAdminId = async () => {
  const seedAdminId = process.env.SEED_ADMIN_ID || '';

  if (seedAdminId) {
    const admin = await Admin.findById(seedAdminId);
    if (!admin) throw new Error(`SEED_ADMIN_ID="${seedAdminId}" does not match any Admin document.`);
    return admin._id;
  }

  const admin = await Admin.findOne().sort({ createdAt: 1 });
  if (!admin) {
    throw new Error(
      [
        'No Admin document found and SEED_ADMIN_ID is not set.',
        'Create one first:',
        '  node scripts/seedRootAdmin.js --email you@example.com --username rootadmin',
        'Then re-run this script (optionally pinning the admin via SEED_ADMIN_ID=<id> node scripts/seedProducts.js).',
      ].join('\n')
    );
  }
  return admin._id;
};

const main = async () => {
  console.log(`Using DATABASE_URL from environment (masked): ${maskConnectionString(config.DATABASE_URL)}`);
  console.log(`Target database name: ${DB_NAME}\n`);

  const connection = await mongoose.connect(config.DATABASE_URL, { dbName: DB_NAME });
  console.log(`Connected. DB HOST: ${connection.connection.host}\n`);

  try {
    const createdBy = await resolveAdminId();
    console.log(`Using createdBy admin _id: ${createdBy}\n`);

    console.log('Wiping existing ProductCategory and Product collections...');
    await Promise.all([ProductCategory.deleteMany({}), Product.deleteMany({})]);
    console.log('Wiped.\n');

    const expected = { categories: 0, products: 0 };

    for (const [catIndex, catData] of PRODUCT_CATEGORIES.entries()) {
      const category = await ProductCategory.create({
        name: catData.name,
        description: catData.description,
        image: null,
        sortOrder: catIndex,
        isActive: true,
        createdBy,
      });
      expected.categories += 1;

      for (const [prodIndex, prodData] of catData.products.entries()) {
        await Product.create({
          name: prodData.name,
          description: prodData.shortDescription,
          shortDescription: prodData.shortDescription,
          price: prodData.price,
          category: category._id,
          stock: prodData.stock,
          inventoryCount: prodData.stock,
          sku: prodData.sku,
          isActive: randomIsActive(),
          isFeatured: prodIndex === 0,
          status: prodData.stock > 0 ? 'inStock' : 'outOfStock',
          publishStatus: 'published',
          visibility: 'public',
          manufacturer: { name: 'Native', brand: 'Native Smart' },
          keywords: ['native', 'smart home', catData.name.toLowerCase()],
          ...placeholderImages(prodData.name),
        });
        expected.products += 1;
      }

      console.log(`Created category "${category.name}" with ${catData.products.length} product(s).`);
    }

    console.log('\nSeed complete. Expected counts (created by this run):');
    console.table(expected);

    console.log('\nVerifying against actual database counts...');
    const [catCount, productCount] = await Promise.all([ProductCategory.countDocuments(), Product.countDocuments()]);
    const actual = { categories: catCount, products: productCount };
    console.table(actual);

    const mismatches = Object.keys(expected).filter((key) => expected[key] !== actual[key]);
    if (mismatches.length > 0) {
      console.error(`\nMISMATCH detected for: ${mismatches.join(', ')}. Some inserts may have failed silently — investigate.`);
      process.exitCode = 1;
    } else {
      console.log('\nAll actual database counts match expected counts. Seed verified.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
};

main().catch((err) => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});
