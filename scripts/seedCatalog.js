// Standalone demo-data seed script for the service catalog (Category -> Subcategory ->
// ServiceGroup -> Service, plus AddOns). Run with: node scripts/seedCatalog.js
//
// This does NOT wire into app startup. It connects to the same MongoDB the running app
// uses (config.DATABASE_URL / DB_NAME, exactly like src/db/index.js and
// scripts/seedRootAdmin.js), wipes only the five catalog collections below, and inserts
// fresh demo data via the real Mongoose models so their pre('validate')/pre('save')
// hooks (slug generation, category/subcategory denormalization) run exactly as they do
// in the live app — this script never sets `slug` or a denormalized `category`/
// `subcategory` field itself.
//
// Requires an existing Admin document to use as createdBy (there is no seed data for
// Admin — provision one first via `node scripts/seedRootAdmin.js --email ... --username
// ...` if none exists yet). Optionally pin a specific admin with:
//   SEED_ADMIN_ID=<adminObjectId> node scripts/seedCatalog.js
// Otherwise the script falls back to the oldest existing Admin document.

import mongoose from 'mongoose';
import config from '../src/config/config.js';
import { DB_NAME } from '../src/constants/constants.js';
import { Admin } from '../src/core/models/index.js';
import { Category, Subcategory, ServiceGroup, Service, AddOn } from '../src/features/service-catalog/models/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Volume knobs
// ─────────────────────────────────────────────────────────────────────────────
// The content below (CATALOG) is hand-curated for realism, not procedurally generated,
// so these constants don't grow the dataset beyond what's curated — they let you TRIM
// it on a re-run (e.g. SUBCATEGORY_PER_CATEGORY_LIMIT = 2 to seed a smaller demo set)
// without touching the generation logic. Leave at Infinity to seed everything curated.
const CATEGORY_LIMIT = Infinity;
const SUBCATEGORY_PER_CATEGORY_LIMIT = Infinity;
const SERVICE_GROUP_PER_SUBCATEGORY_LIMIT = Infinity;
const SERVICES_PER_GROUP_LIMIT = Infinity;
const ADDONS_PER_SERVICE_LIMIT = 2;

// ─────────────────────────────────────────────────────────────────────────────
// Randomization helpers
// ─────────────────────────────────────────────────────────────────────────────
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Prices ending in 9 (299, 1999, ...) to match typical Indian home-services pricing.
const nicePrice = (min, max) => {
  const raw = randomInt(min, max);
  return Math.max(min, Math.round(raw / 10) * 10 - 1);
};

// mrp is always 10-30% above price, also nudged to end in 9.
const withMrp = (price) => {
  const discountPct = randomInt(10, 30);
  const rawMrp = price / (1 - discountPct / 100);
  const mrp = Math.round(rawMrp / 10) * 10 - 1;
  return mrp > price ? mrp : price + 49;
};

const niceDuration = (min, max) => {
  const raw = randomInt(min, max);
  return Math.round(raw / 5) * 5;
};

const randomRating = () => Math.round((4.5 + Math.random() * 0.4) * 100) / 100;

// ~8% of services are "blockbuster" listings with very high review counts; the rest
// sit in a more modest, still-varied range.
const randomReviewCount = () => (Math.random() < 0.08 ? randomInt(50_000, 2_900_000) : randomInt(500, 50_000));

const randomIsActive = () => Math.random() < 0.9;

const placeholderImage = (seed) => ({
  key: `placeholder/${seed}`,
  url: 'https://placehold.co/400x300',
});

const DESCRIPTION_TEMPLATES = [
  (name) => `Professional ${name.toLowerCase()} carried out by trained, background-verified experts.`,
  (name) => `Book a hassle-free ${name.toLowerCase()} with standard safety checks and clean-up included.`,
  (name) => `Get ${name.toLowerCase()} done at home by verified professionals with an on-time service guarantee.`,
  (name) => `Reliable ${name.toLowerCase()} handled by skilled technicians using quality tools and materials.`,
  (name) => `Convenient at-home ${name.toLowerCase()}, performed by certified, experienced professionals.`,
];

const buildDescription = (name) => DESCRIPTION_TEMPLATES[randomInt(0, DESCRIPTION_TEMPLATES.length - 1)](name);

const maskConnectionString = (uri) => (uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : uri);

// ─────────────────────────────────────────────────────────────────────────────
// Price (₹) / duration (mins) bands per category — services within a category get a
// randomized value inside these ranges rather than a fixed number, so pricing/duration
// look organic instead of repeating a handful of exact figures.
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_META = {
  'AC & Appliance Repair': { priceRange: [299, 2499], durationRange: [30, 120] },
  'Cleaning & Pest Control': { priceRange: [249, 4999], durationRange: [45, 240] },
  "Women's Salon & Spa": { priceRange: [199, 3999], durationRange: [20, 150] },
  "Men's Salon & Massage": { priceRange: [149, 1999], durationRange: [20, 120] },
  'Electrician, Plumber & Carpenter': { priceRange: [99, 1499], durationRange: [20, 90] },
  'Painting & Waterproofing': { priceRange: [999, 29999], durationRange: [60, 240] },
  'Wall Panels & Home Décor': { priceRange: [1499, 49999], durationRange: [60, 240] },
  'Native Smart Products': { priceRange: [799, 14999], durationRange: [30, 120] },
  'Packers & Movers': { priceRange: [1999, 24999], durationRange: [60, 240] },
  'Home Renovation & Interior Design': { priceRange: [1999, 149999], durationRange: [60, 240] },
};

// ─────────────────────────────────────────────────────────────────────────────
// Curated catalog content — hand-written names/bullets for realism (not placeholder
// text). Price, mrp, duration, rating, review count and isActive are generated at seed
// time (see main()) using the ranges/helpers above; slug and denormalized
// category/subcategory refs are left entirely to the model hooks.
// ─────────────────────────────────────────────────────────────────────────────
const CATALOG = [
  {
    name: 'AC & Appliance Repair',
    description: 'Repair, service, and installation for ACs and major home appliances by certified technicians.',
    subcategories: [
      {
        name: 'AC Repair & Service',
        description: 'Maintenance, repair, and gas refill services for split and window ACs.',
        serviceGroups: [
          {
            name: 'General Service & Repair',
            description: 'Foam-jet cleaning, repairs, and gas refills for split and window ACs.',
            bullets: [
              'Applicable for both window and split ACs',
              'Foam-jet cleaning of indoor & outdoor units',
              '45-day service warranty',
            ],
            services: [
              { name: 'Foam-jet AC service (1 AC)', addOns: [{ name: 'Extra gas top-up', price: 299 }] },
              {
                name: 'Foam-jet AC service (2 ACs)',
                addOns: [
                  { name: 'Extra gas top-up', price: 299 },
                  { name: 'Anti-rust coating', price: 199 },
                ],
              },
              { name: 'AC gas refill (split AC)' },
              { name: 'AC repair - no cooling issue', addOns: [{ name: 'PCB replacement (if required)', price: 899 }] },
              { name: 'AC dry service (without gas top-up)' },
            ],
          },
          {
            name: 'Installation & Uninstallation',
            description: 'Split and window AC installation, uninstallation, and re-installation.',
            bullets: [
              'Free re-installation within 30 days on request',
              'Includes copper piping up to 3 ft',
              'Stabilizer check included',
            ],
            services: [
              { name: 'Split AC installation' },
              { name: 'Window AC installation' },
              {
                name: 'AC uninstallation & re-installation (shifting)',
                addOns: [{ name: 'Extra copper piping (per ft)', price: 150 }],
              },
              { name: 'Split AC gas leak test & top-up' },
            ],
          },
        ],
      },
      {
        name: 'Washing Machine',
        description: 'Repair, service, and installation for front-load and top-load washing machines.',
        serviceGroups: [
          {
            name: 'Repair & Service',
            description: 'Diagnosis, repair, and general servicing for all washing machine types.',
            bullets: [
              'Diagnosis included in visit charge',
              'Applicable for both semi & fully automatic machines',
              '90-day warranty on repairs',
            ],
            services: [
              { name: 'Washing machine general service' },
              { name: 'Front-load washing machine repair', addOns: [{ name: 'Drum bearing replacement', price: 799 }] },
              { name: 'Top-load washing machine repair' },
              { name: 'Washing machine drum cleaning' },
              { name: 'Washing machine vibration/noise fix' },
            ],
          },
          {
            name: 'Installation & Uninstallation',
            description: 'Setup and relocation service for fully-automatic and semi-automatic machines.',
            bullets: [
              'Free demo on usage',
              'Includes tap & drainage connection check',
              'Wall-mount bracket fitting available',
            ],
            services: [
              { name: 'Fully-automatic washing machine installation' },
              { name: 'Semi-automatic washing machine installation' },
              { name: 'Washing machine uninstallation & re-installation' },
              { name: 'Washing machine tap connection extension' },
            ],
          },
        ],
      },
      {
        name: 'Refrigerator',
        description: 'Repair, gas refill, and cooling issue fixes for single and double-door refrigerators.',
        serviceGroups: [
          {
            name: 'Repair & Service',
            description: 'General servicing and repair for single, double, and side-by-side door refrigerators.',
            bullets: [
              'Applicable for single, double & side-by-side door fridges',
              'Cooling & compressor diagnosis included',
              '45-day warranty on repairs',
            ],
            services: [
              { name: 'Refrigerator general service' },
              {
                name: 'Refrigerator not cooling - repair',
                addOns: [{ name: 'Compressor replacement (if required)', price: 1999 }],
              },
              { name: 'Refrigerator gas refill' },
              { name: 'Refrigerator door seal replacement' },
            ],
          },
          {
            name: 'Gas Refill & Cooling',
            description: 'Leak testing and gas refill for refrigerators and deep freezers.',
            bullets: [
              'Includes leak test before refill',
              'Applicable for R134a & R600a gas types',
              '6-month cooling performance warranty',
            ],
            services: [
              { name: 'Single-door refrigerator gas refill' },
              { name: 'Double-door refrigerator gas refill', addOns: [{ name: 'Leak point repair', price: 499 }] },
              { name: 'Deep freezer gas refill' },
              { name: 'Deep freezer repair - not cooling' },
            ],
          },
        ],
      },
      {
        name: 'Television',
        description: 'Repair, mounting, and installation services for LED, LCD, and smart TVs.',
        serviceGroups: [
          {
            name: 'Repair & Service',
            description: 'Diagnosis and repair for display, sound, and software issues on all TV types.',
            bullets: [
              'Applicable for LED, LCD & smart TVs',
              'Free diagnosis with repair booking',
              '30-day warranty on parts replaced',
            ],
            services: [
              { name: 'TV no display - repair', addOns: [{ name: 'Panel replacement (if required)', price: 2499 }] },
              { name: 'TV no sound - repair' },
              { name: 'Smart TV software & app setup' },
              { name: 'TV remote/app pairing setup' },
            ],
          },
          {
            name: 'Installation & Mounting',
            description: 'Wall mounting and stand installation for TVs of all sizes.',
            bullets: [
              'Wall-mount bracket included up to 43-inch',
              'Cable management included',
              'Free demo on setup',
            ],
            services: [
              { name: 'TV wall mounting (up to 43-inch)', addOns: [{ name: 'Extra bracket for larger TV', price: 399 }] },
              { name: 'TV wall mounting (44-inch to 65-inch)' },
              { name: 'TV stand installation' },
              { name: 'Soundbar installation' },
            ],
          },
        ],
      },
      {
        name: 'Chimney & Microwave',
        description: 'Deep cleaning, repair, and installation for kitchen chimneys and microwave ovens.',
        serviceGroups: [
          {
            name: 'Chimney Service & Repair',
            description: 'Baffle filter cleaning, suction fixes, and installation for kitchen chimneys.',
            bullets: [
              'Includes baffle/filter deep cleaning',
              'Auto-clean chimneys supported',
              'Suction check included',
            ],
            services: [
              { name: 'Chimney deep cleaning & service', addOns: [{ name: 'Filter replacement', price: 599 }] },
              { name: 'Chimney repair - low suction' },
              { name: 'Chimney installation' },
              { name: 'Chimney motor replacement' },
            ],
          },
          {
            name: 'Microwave Repair & Service',
            description: 'Repair and servicing for solo, grill, and convection microwave ovens.',
            bullets: [
              'Applicable for solo, grill & convection microwaves',
              'Turntable & magnetron check included',
              '30-day warranty on repairs',
            ],
            services: [
              { name: 'Microwave general service' },
              {
                name: 'Microwave not heating - repair',
                addOns: [{ name: 'Magnetron replacement (if required)', price: 899 }],
              },
              { name: 'Microwave door/latch repair' },
              { name: 'Microwave installation (built-in)' },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Cleaning & Pest Control',
    description: 'Deep cleaning, sanitization, and pest control services for homes and apartments.',
    subcategories: [
      {
        name: 'Full Home Cleaning',
        description: 'Deep cleaning packages for furnished and unfurnished homes of all sizes.',
        serviceGroups: [
          {
            name: 'Home Deep Cleaning',
            description: 'Whole-home deep cleaning covering kitchen, bathrooms, and every room.',
            bullets: [
              'Includes kitchen, bathroom & all rooms',
              'Eco-friendly cleaning chemicals used',
              'High-pressure vacuum & scrubbing machines',
            ],
            services: [
              { name: 'Furnished apartment - 1 BHK deep cleaning' },
              { name: 'Furnished apartment - 2 BHK deep cleaning', addOns: [{ name: 'Balcony deep cleaning', price: 299 }] },
              {
                name: 'Furnished apartment - 3 BHK deep cleaning',
                addOns: [
                  { name: 'Balcony deep cleaning', price: 299 },
                  { name: 'Extra bathroom', price: 249 },
                ],
              },
              { name: 'Unfurnished apartment deep cleaning (2 BHK)' },
              { name: 'Bungalow/duplex deep cleaning' },
            ],
          },
          {
            name: 'Move-in/Move-out Cleaning',
            description: 'Deep cleaning timed for shifting into or out of a home.',
            bullets: [
              'Ideal before/after shifting homes',
              'Covers cabinets, windows & floors',
              'Same-day service available',
            ],
            services: [
              { name: 'Move-in home cleaning (2 BHK)' },
              { name: 'Move-out home cleaning (2 BHK)' },
              { name: 'Post-construction cleaning', addOns: [{ name: 'Debris removal', price: 499 }] },
              { name: 'Deep cleaning for rental handover' },
            ],
          },
        ],
      },
      {
        name: 'Bathroom & Kitchen Cleaning',
        description: 'Targeted deep cleaning for bathrooms and kitchens including tile and tap descaling.',
        serviceGroups: [
          {
            name: 'Bathroom Cleaning',
            description: 'Tile, tap, and fixture deep cleaning with anti-fungal treatment.',
            bullets: [
              'Tile & tap descaling included',
              'Anti-fungal treatment for grout',
              'Odour treatment included',
            ],
            services: [
              { name: 'Single bathroom deep cleaning', addOns: [{ name: 'Anti-fungal grout treatment', price: 199 }] },
              { name: 'Two bathroom deep cleaning package' },
              { name: 'Western/Indian toilet deep cleaning' },
              { name: 'Bathroom tile grout whitening' },
              { name: 'Bathroom fittings deep polish' },
            ],
          },
          {
            name: 'Kitchen Cleaning',
            description: 'Grease removal and deep cleaning for kitchen surfaces and cabinets.',
            bullets: [
              'Includes chimney exterior, hob & tiles',
              'Cabinet interior wipe-down included',
              'Grease removal from walls',
            ],
            services: [
              { name: 'Kitchen deep cleaning' },
              { name: 'Modular kitchen deep cleaning', addOns: [{ name: 'Chimney interior cleaning add-on', price: 399 }] },
              { name: 'Kitchen cabinet deep cleaning' },
              { name: 'Kitchen exhaust duct cleaning' },
            ],
          },
        ],
      },
      {
        name: 'Sofa & Carpet Cleaning',
        description: 'Shampoo and vacuum-based cleaning for sofas, carpets, and mattresses.',
        serviceGroups: [
          {
            name: 'Sofa Cleaning',
            description: 'Dry vacuuming and shampoo wash for fabric and leather seating.',
            bullets: [
              'Dry vacuuming + shampoo wash',
              'Fabric & leather sofas supported',
              '4-6 hours drying time',
            ],
            services: [
              { name: 'Sofa cleaning (5 seater)', addOns: [{ name: 'Fabric protection spray', price: 249 }] },
              { name: 'Sofa cleaning (7 seater)' },
              { name: 'Recliner cleaning' },
              { name: 'Mattress cleaning (queen/king)' },
              { name: 'Recliner mechanism servicing' },
            ],
          },
          {
            name: 'Carpet & Rug Cleaning',
            description: 'Deep shampoo and stain removal for carpets and rugs.',
            bullets: [
              'Deep shampoo & stain removal',
              'Suitable for wool & synthetic carpets',
              'Anti-allergen treatment included',
            ],
            services: [
              { name: 'Carpet cleaning (small, up to 5x7 ft)' },
              { name: 'Carpet cleaning (large, above 5x7 ft)', addOns: [{ name: 'Stain protection coating', price: 299 }] },
              { name: 'Rug cleaning' },
              { name: 'Curtain cleaning (per panel)' },
            ],
          },
        ],
      },
      {
        name: 'Pest Control',
        description: 'Chemical and gel-based pest control treatments for common household pests.',
        serviceGroups: [
          {
            name: 'Cockroach & General Pest Control',
            description: 'Gel-based and spray treatments for cockroaches and general household pests.',
            bullets: [
              'Odourless gel-based treatment available',
              'Safe for kids & pets after drying',
              '30-day service warranty',
            ],
            services: [
              { name: 'Cockroach control - gel treatment (1 BHK)', addOns: [{ name: 'Kitchen cabinet interior treatment', price: 199 }] },
              { name: 'Cockroach control - gel treatment (2/3 BHK)' },
              { name: 'General pest control (2 BHK)' },
              { name: 'Bed bug control treatment' },
            ],
          },
          {
            name: 'Termite & Rodent Control',
            description: 'Termite treatment and rodent baiting for homes and furniture.',
            bullets: [
              'Includes pre-construction & post-construction options',
              'Rodent bait stations included',
              '90-day service warranty',
            ],
            services: [
              { name: 'Termite control - post construction', addOns: [{ name: 'Extended 6-month warranty', price: 599 }] },
              { name: 'Termite control - wooden furniture treatment' },
              { name: 'Rodent control (2 BHK)' },
              { name: 'Ant & silverfish control' },
            ],
          },
        ],
      },
      {
        name: 'Water Tank Cleaning',
        description: 'Mechanized cleaning and sanitization of overhead and underground water tanks.',
        serviceGroups: [
          {
            name: 'Water Tank Cleaning',
            description: 'Sludge removal and sanitization for overhead and underground tanks.',
            bullets: [
              'Mechanized cleaning, no manual entry',
              'Includes sludge & sediment removal',
              'Sanitization with safe chemicals',
            ],
            services: [
              { name: 'Water tank cleaning (up to 500L)', addOns: [{ name: 'Sanitization add-on', price: 149 }] },
              { name: 'Water tank cleaning (500L - 1000L)' },
              { name: 'Water tank cleaning (above 1000L)' },
              { name: 'Tank cleaning with chemical-free method' },
            ],
          },
          {
            name: 'Sump & Overhead Tank Combo',
            description: 'Combined sump and overhead tank cleaning in a single visit.',
            bullets: [
              'Covers both sump & overhead tank',
              'Before/after photo report shared',
              'Same-day slot available',
            ],
            services: [
              { name: 'Sump + overhead tank cleaning combo', addOns: [{ name: 'Extra tank (per unit)', price: 399 }] },
              { name: 'Underground sump cleaning only' },
              { name: 'Overhead tank cleaning only' },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Women's Salon & Spa",
    description: 'At-home salon, spa, and beauty services for women by trained professionals.',
    subcategories: [
      {
        name: 'Facial & Cleanup',
        description: 'Skin brightening facials and quick cleanups using premium brands.',
        serviceGroups: [
          {
            name: 'Facials',
            description: 'Cleansing, scrub, and mask facials using premium salon brands.',
            bullets: ['Choice of O3+, Lakme or Livon products', 'Includes cleansing, scrub & mask', '60-75 minutes session'],
            services: [
              { name: 'Fruit facial', addOns: [{ name: 'Under-eye treatment', price: 199 }] },
              { name: 'Gold facial' },
              { name: 'De-tan facial' },
              { name: 'Anti-ageing facial', addOns: [{ name: 'Neck & shoulder massage', price: 249 }] },
              { name: 'Diamond facial' },
            ],
          },
          {
            name: 'D-Tan & Cleanups',
            description: 'Quick sun-tan removal and cleanup treatments for face and neck.',
            bullets: ['Removes sun tan from face & neck', 'Quick 30-40 minute service', 'Suitable for all skin types'],
            services: [
              { name: 'Face & neck D-tan' },
              { name: 'Insta glow cleanup' },
              { name: 'Face & neck cleanup' },
              { name: 'Party glow facial' },
            ],
          },
        ],
      },
      {
        name: 'Waxing, Threading & Bleach',
        description: 'Full body waxing, threading, and bleach services using rica and chocolate wax.',
        serviceGroups: [
          {
            name: 'Waxing',
            description: 'Rica and chocolate wax services for arms, legs, and full body.',
            bullets: ['Choice of rica or chocolate wax', 'Hygienic, single-use strips', 'Post-wax soothing gel applied'],
            services: [
              { name: 'Full arms & legs waxing', addOns: [{ name: 'Underarms waxing', price: 99 }] },
              { name: 'Half arms & half legs waxing' },
              { name: 'Full body waxing (rica wax)' },
              { name: 'Bikini line waxing' },
              { name: 'Chocolate wax full body (express)' },
            ],
          },
          {
            name: 'Threading & Bleach',
            description: 'Eyebrow threading and ammonia-free bleach treatments.',
            bullets: ['Precise brow shaping', 'Ammonia-free bleach options available', 'Quick 15-30 minute service'],
            services: [
              { name: 'Eyebrow threading' },
              { name: 'Face & neck bleach', addOns: [{ name: 'Upper lip threading', price: 49 }] },
              { name: 'Full body bleach (fruit bleach)' },
              { name: 'Full face threading' },
            ],
          },
        ],
      },
      {
        name: 'Hair Care & Styling',
        description: 'Haircuts, spa, and styling services using professional-grade products.',
        serviceGroups: [
          {
            name: 'Haircut & Styling',
            description: 'Haircuts, trims, and styling with wash and blow-dry included.',
            bullets: ['Includes wash & blow-dry', 'Trained stylists with 3+ years experience', 'Style consultation included'],
            services: [
              { name: "Women's haircut", addOns: [{ name: 'Hair spa add-on', price: 499 }] },
              { name: 'Hair trim & split-end repair' },
              { name: 'Blow-dry & styling' },
              { name: 'Hair straightening (per session)' },
            ],
          },
          {
            name: 'Hair Spa & Treatments',
            description: 'Deep conditioning and scalp treatments for dry or damaged hair.',
            bullets: ['Deep conditioning treatment included', 'Scalp massage included', 'Suitable for dry & damaged hair'],
            services: [
              { name: "Hair spa (L'Oreal/Matrix)", addOns: [{ name: 'Hair serum application', price: 299 }] },
              { name: 'Anti-dandruff hair treatment' },
              { name: 'Keratin hair treatment' },
              { name: 'Hair fall control treatment' },
              { name: 'Scalp detox treatment' },
            ],
          },
        ],
      },
      {
        name: 'Manicure & Pedicure',
        description: 'Classic to luxury mani-pedi services with nail art add-ons.',
        serviceGroups: [
          {
            name: 'Manicure',
            description: 'Nail shaping, cuticle care, and hand massage services.',
            bullets: ['Includes nail shaping & cuticle care', 'Hand massage included', 'Choice of classic or spa manicure'],
            services: [
              { name: 'Classic manicure', addOns: [{ name: 'Nail art (per hand)', price: 149 }] },
              { name: 'Spa manicure' },
              { name: 'Gel polish manicure' },
              { name: 'Nail extension (per set)' },
            ],
          },
          {
            name: 'Pedicure',
            description: 'Foot soak, scrub, and callus removal services.',
            bullets: ['Includes foot soak & scrub', 'Callus removal included', 'Hygienic, single-use tools'],
            services: [
              { name: 'Classic pedicure', addOns: [{ name: 'Foot massage add-on', price: 199 }] },
              { name: 'Spa pedicure' },
              { name: 'Gel polish pedicure' },
              { name: 'Paraffin wax pedicure' },
            ],
          },
        ],
      },
      {
        name: 'Bridal & Party Makeup',
        description: 'Professional makeup and draping services for weddings and parties.',
        serviceGroups: [
          {
            name: 'Party Makeup',
            description: 'HD and airbrush makeup for parties and events.',
            bullets: ['Includes base, eyes & contouring', 'HD & airbrush options available', 'Complimentary hairstyling'],
            services: [
              { name: 'Party makeup (HD)', addOns: [{ name: 'Saree draping', price: 499 }] },
              { name: 'Party makeup (airbrush)' },
              { name: 'Nose to toe party makeup' },
              { name: 'Engagement makeup' },
            ],
          },
          {
            name: 'Bridal Makeup',
            description: 'Trial and wedding-day bridal makeup with premium cosmetics.',
            bullets: ['Trial session included', 'Premium bridal-grade cosmetics used', 'Includes hairstyling & draping'],
            services: [
              {
                name: 'Bridal makeup (HD)',
                addOns: [
                  { name: 'Pre-bridal trial session', price: 999 },
                  { name: 'Family member makeup', price: 1499 },
                ],
              },
              { name: 'Bridal makeup (airbrush)' },
              { name: 'Bridal hairstyling only' },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Men's Salon & Massage",
    description: 'At-home grooming, haircuts, and massage therapy services for men.',
    subcategories: [
      {
        name: 'Haircut & Styling',
        description: 'Professional haircuts and styling using trimmers and scissor techniques.',
        serviceGroups: [
          {
            name: 'Haircut',
            description: 'Scissor and clipper haircuts with wash and styling.',
            bullets: ['Includes wash & styling', 'Choice of scissor or clipper cut', '20-30 minute service'],
            services: [
              { name: "Men's haircut", addOns: [{ name: 'Hair wash & conditioning', price: 99 }] },
              { name: 'Kids haircut (below 12 yrs)' },
              { name: 'Hair styling & spiking' },
            ],
          },
          {
            name: 'Hair Colour',
            description: 'Ammonia-free hair colour with full grey coverage.',
            bullets: ['Ammonia-free hair colour options', 'Covers grey hair fully', 'Includes wash after colouring'],
            services: [
              { name: 'Hair colour (global)', addOns: [{ name: 'Beard colour add-on', price: 149 }] },
              { name: 'Grey coverage hair colour' },
              { name: 'Highlights/streaks (partial)' },
            ],
          },
        ],
      },
      {
        name: 'Beard & Shave Grooming',
        description: 'Beard styling, shaving, and grooming services with hot towel finish.',
        serviceGroups: [
          {
            name: 'Beard Styling',
            description: 'Beard trimming, shaping, and design with hot towel finish.',
            bullets: ['Includes trimming & shaping', 'Hot towel finish included', 'Aftershave application included'],
            services: [
              { name: 'Beard trim & shaping', addOns: [{ name: 'Beard colour', price: 199 }] },
              { name: 'Beard styling with design' },
              { name: 'French beard shaping' },
            ],
          },
          {
            name: 'Shave & Grooming',
            description: 'Classic razor shave and head shave services.',
            bullets: ['Classic razor shave', 'Includes pre-shave & aftershave care', 'Skin-friendly products used'],
            services: [
              { name: 'Classic clean shave' },
              { name: 'Head shave' },
              { name: 'Beard + shave combo' },
            ],
          },
        ],
      },
      {
        name: 'Facial & Cleanup',
        description: "Skin cleanup and facial treatments formulated for men's skin.",
        serviceGroups: [
          {
            name: 'Facials',
            description: 'De-tan and brightening facials formulated for men.',
            bullets: ['De-tan & brightening formula', 'Includes scrub, mask & massage', '45-60 minute session'],
            services: [
              { name: 'Fruit facial (men)', addOns: [{ name: 'Under-eye treatment', price: 199 }] },
              { name: 'Charcoal detox facial' },
              { name: 'De-tan facial (men)' },
            ],
          },
          {
            name: 'Cleanups',
            description: 'Quick pre-event cleanups to remove dirt and excess oil.',
            bullets: ['Quick 30-minute cleanup', 'Removes dirt & excess oil', 'Suitable before events'],
            services: [
              { name: 'Insta glow cleanup (men)' },
              { name: 'Face & neck cleanup (men)' },
              { name: 'De-tan cleanup (men)' },
            ],
          },
        ],
      },
      {
        name: 'Body Massage',
        description: 'Therapeutic and relaxation massages using aromatic oils.',
        serviceGroups: [
          {
            name: 'Classic Massages',
            description: 'Full body relaxation massages using aromatic oils.',
            bullets: ['Choice of coconut, almond or olive oil', 'Full body 60-minute session', 'Certified male therapists'],
            services: [
              { name: 'Classic full body massage (60 min)', addOns: [{ name: 'Extended 90-minute session', price: 499 }] },
              { name: 'Head, neck & shoulder massage' },
              { name: 'Foot reflexology massage' },
            ],
          },
          {
            name: 'Therapeutic Massages',
            description: 'Deep tissue and pain-relief massages for muscle stiffness.',
            bullets: ['Targets muscle stiffness & pain relief', 'Deep tissue technique', 'Recommended for desk-job professionals'],
            services: [
              { name: 'Deep tissue massage', addOns: [{ name: 'Hot stone therapy add-on', price: 399 }] },
              { name: 'Back & shoulder pain relief massage' },
              { name: 'Full body Ayurvedic massage' },
            ],
          },
        ],
      },
      {
        name: 'Salon Packages',
        description: 'Bundled grooming packages combining haircut, facial, and massage.',
        serviceGroups: [
          {
            name: 'Grooming Combos',
            description: 'Bundled haircut, beard, and facial packages at combo pricing.',
            bullets: ['Best value bundled pricing', 'Includes haircut + facial/massage', '60-90 minute total session'],
            services: [
              { name: 'Haircut + beard styling combo', addOns: [{ name: 'Add hair colour', price: 299 }] },
              { name: 'Haircut + facial combo' },
              { name: 'Grooming package (haircut + shave + facial)' },
            ],
          },
          {
            name: 'Premium Packages',
            description: 'Multi-service premium packages for special occasions.',
            bullets: ['Includes 3+ services in one visit', 'Premium products used throughout', 'Priority scheduling'],
            services: [
              {
                name: 'Premium grooming package (haircut + facial + massage)',
                addOns: [{ name: 'Add manicure', price: 349 }],
              },
              { name: 'Groom-to-go wedding package' },
              { name: 'Anti-ageing facial + massage combo' },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Electrician, Plumber & Carpenter',
    description: 'On-demand electrical, plumbing, and carpentry repair services for the home.',
    subcategories: [
      {
        name: 'Electrician',
        description: 'Wiring, switchboard, and appliance installation services by licensed electricians.',
        serviceGroups: [
          {
            name: 'Wiring & Switchboard',
            description: 'Switch, socket, and wiring repair using ISI-certified materials.',
            bullets: ['Visit charge waived if work is done', 'ISI-certified wiring materials used', '30-day service warranty'],
            services: [
              { name: 'Switch/socket repair or replacement', addOns: [{ name: 'Extra switch point', price: 99 }] },
              { name: 'Switchboard installation' },
              { name: 'House wiring inspection & repair' },
              { name: 'MCB/fuse replacement' },
              { name: 'Inverter/stabilizer wiring check' },
            ],
          },
          {
            name: 'Fan & Appliance Installation',
            description: 'Ceiling fan, exhaust fan, and geyser installation with wiring checks.',
            bullets: ['Includes mounting & wiring check', 'Applicable for ceiling & wall fans', 'Balancing check included'],
            services: [
              { name: 'Ceiling fan installation', addOns: [{ name: 'Regulator installation', price: 149 }] },
              { name: 'Exhaust fan installation' },
              { name: 'Geyser installation & wiring check' },
              { name: 'Water motor wiring check' },
            ],
          },
        ],
      },
      {
        name: 'Plumber',
        description: 'Tap, pipe, and bathroom fitting repair services by verified plumbers.',
        serviceGroups: [
          {
            name: 'Tap & Pipe Repair',
            description: 'Leak-proof repairs for taps, pipes, and drainage systems.',
            bullets: ['Visit charge waived if work is done', 'Leak-proof sealing guaranteed', '30-day service warranty'],
            services: [
              { name: 'Tap repair or replacement', addOns: [{ name: 'Extra tap (per unit)', price: 199 }] },
              { name: 'Pipe leakage repair' },
              { name: 'Drainage/blockage clearing' },
              { name: 'Water motor installation & repair' },
              { name: 'Water tank overflow pipe fix' },
            ],
          },
          {
            name: 'Bathroom Fittings',
            description: 'Basin, shower, and flush tank installation and repair.',
            bullets: ['Includes basin, shower & flush fittings', 'Waterproof sealing included', 'Same-day service available'],
            services: [
              { name: 'Wash basin installation', addOns: [{ name: 'Basin mixer installation', price: 299 }] },
              { name: 'Shower/health faucet installation' },
              { name: 'Toilet flush tank repair' },
              { name: 'Bidet/jet spray installation' },
            ],
          },
        ],
      },
      {
        name: 'Carpenter',
        description: 'Furniture repair, assembly, and door/window fixing by skilled carpenters.',
        serviceGroups: [
          {
            name: 'Furniture Repair',
            description: 'Hinge, drawer, and shelf repair for wooden and engineered wood furniture.',
            bullets: [
              'Visit charge waived if work is done',
              'Suitable for wooden & engineered wood furniture',
              'Minor polishing touch-up included',
            ],
            services: [
              { name: 'Furniture repair (general)', addOns: [{ name: 'Hardware replacement (hinges/handles)', price: 99 }] },
              { name: 'Bed/almirah hinge repair' },
              { name: 'Drawer channel repair' },
              { name: 'Wardrobe shelf/rod fixing' },
              { name: 'Bed frame reinforcement' },
            ],
          },
          {
            name: 'Door & Window Repair',
            description: 'Alignment and hardware fixes for wooden and PVC doors and windows.',
            bullets: ['Includes alignment & hardware check', 'Applicable for wooden & PVC doors', 'Same-day service available'],
            services: [
              { name: 'Door repair (hinges/alignment)', addOns: [{ name: 'Door lock replacement', price: 349 }] },
              { name: 'Window repair & alignment' },
              { name: 'New door/window fitting' },
              { name: 'Grill/mesh door fitting' },
            ],
          },
        ],
      },
      {
        name: 'Locksmith',
        description: 'Lock repair, replacement, and emergency unlocking services.',
        serviceGroups: [
          {
            name: 'Lock Repair & Replacement',
            description: 'Door and cabinet lock repair and replacement with duplicate keys.',
            bullets: ['Emergency response within 60 minutes', 'Applicable for main door & cabinet locks', 'Includes 2 duplicate keys'],
            services: [
              { name: 'Door lock repair', addOns: [{ name: 'Extra duplicate key', price: 99 }] },
              { name: 'Door lock replacement' },
              { name: 'Cabinet/drawer lock repair' },
            ],
          },
          {
            name: 'Emergency Unlocking',
            description: 'Fast, non-destructive unlocking for doors and cabinets.',
            bullets: ['Fast response, avg 45-60 minutes', 'Non-destructive unlocking attempted first', 'Available for main door & almirah'],
            services: [
              { name: 'Main door emergency unlock', addOns: [{ name: 'New lock installation after unlock', price: 499 }] },
              { name: 'Almirah/cabinet emergency unlock' },
              { name: 'Vehicle/gate emergency unlock' },
            ],
          },
        ],
      },
      {
        name: 'Furniture Assembly',
        description: 'Flat-pack and modular furniture assembly for new home setups.',
        serviceGroups: [
          {
            name: 'Flat-Pack Assembly',
            description: 'Assembly of flat-pack beds, wardrobes, and desks with wall-anchoring.',
            bullets: ['Tools & hardware included', 'Suitable for IKEA & other flat-pack brands', 'Wall-anchoring included for safety'],
            services: [
              { name: 'Bed assembly', addOns: [{ name: 'Mattress unboxing & setup', price: 99 }] },
              { name: 'Wardrobe assembly' },
              { name: 'Study table/desk assembly' },
            ],
          },
          {
            name: 'Modular Furniture Setup',
            description: 'Installation of modular wardrobes and TV units with minor drilling.',
            bullets: ['Includes minor wall drilling', 'Suitable for modular wardrobes & TV units', 'Debris cleanup included'],
            services: [
              { name: 'Modular wardrobe installation', addOns: [{ name: 'Extra unit installation', price: 799 }] },
              { name: 'TV unit/entertainment unit assembly' },
              { name: 'Office furniture assembly' },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Painting & Waterproofing',
    description: 'Interior and exterior painting, waterproofing, and wood finishing services.',
    subcategories: [
      {
        name: 'Interior Painting',
        description: 'Full home and room-wise interior painting packages using premium emulsions.',
        serviceGroups: [
          {
            name: 'Full Home Painting Packages',
            description: 'Whole-home painting with putty, primer, and two coats of emulsion.',
            bullets: [
              'Includes putty, primer & 2 coats of paint',
              'Choice of Asian Paints/Berger shades',
              'Furniture covering & cleanup included',
            ],
            services: [
              { name: 'Interior painting - 1 BHK', addOns: [{ name: 'Premium emulsion upgrade', price: 1999 }] },
              { name: 'Interior painting - 2 BHK' },
              { name: 'Interior painting - 3 BHK', addOns: [{ name: 'Premium emulsion upgrade', price: 2999 }] },
              { name: 'Interior painting - villa/duplex' },
              { name: 'Interior painting - 4 BHK/villa' },
            ],
          },
          {
            name: 'Room/Wall Painting',
            description: 'Single-room and accent-wall painting with crack filling included.',
            bullets: ['Ideal for single room or accent wall', 'Includes minor crack filling', '1-day service for single room'],
            services: [
              { name: 'Single room painting', addOns: [{ name: 'Texture accent wall', price: 1499 }] },
              { name: 'Accent wall painting' },
              { name: 'Ceiling painting' },
              { name: "Kids room theme painting" },
            ],
          },
        ],
      },
      {
        name: 'Exterior Painting',
        description: 'Weatherproof exterior painting for independent homes and building facades.',
        serviceGroups: [
          {
            name: 'Exterior Wall Painting',
            description: 'Weatherproof exterior emulsion painting with scaffolding included.',
            bullets: ['Weatherproof exterior emulsion used', 'Includes scaffolding where required', 'Crack filling & primer coat included'],
            services: [
              { name: 'Exterior painting - independent house (small)', addOns: [{ name: 'Weatherproof coating upgrade', price: 2999 }] },
              { name: 'Exterior painting - independent house (large)' },
              { name: 'Building facade painting' },
            ],
          },
          {
            name: 'Texture & Grill Painting',
            description: 'Rust-proof enamel and textured finishes for metal and exterior surfaces.',
            bullets: ['Rust-proof enamel for metal surfaces', 'Textured finish options available', 'Includes minor surface prep'],
            services: [
              { name: 'Grill & gate painting', addOns: [{ name: 'Rust removal treatment', price: 599 }] },
              { name: 'Textured exterior wall finish' },
              { name: 'Metal railing painting' },
            ],
          },
        ],
      },
      {
        name: 'Waterproofing',
        description: 'Leak-proofing treatments for terraces, walls, and bathrooms.',
        serviceGroups: [
          {
            name: 'Terrace & Roof Waterproofing',
            description: 'Crack filling and membrane coating for terraces and roofs.',
            bullets: ['Includes crack filling & membrane coating', '5-year warranty on select treatments', 'Suitable for RCC & sheet roofs'],
            services: [
              { name: 'Terrace waterproofing (up to 500 sqft)', addOns: [{ name: 'Extended 5-year warranty', price: 1999 }] },
              { name: 'Terrace waterproofing (above 500 sqft)' },
              { name: 'Roof leakage repair' },
            ],
          },
          {
            name: 'Wall & Bathroom Waterproofing',
            description: 'Seepage prevention treatment for walls, bathrooms, and water tanks.',
            bullets: ['Prevents seepage & dampness', 'Includes surface prep & sealant coating', '2-year warranty on treatment'],
            services: [
              { name: 'Bathroom waterproofing', addOns: [{ name: 'Extended warranty', price: 999 }] },
              { name: 'Wall seepage treatment' },
              { name: 'Water tank waterproofing' },
              { name: 'Balcony waterproofing' },
            ],
          },
        ],
      },
      {
        name: 'Wood Polishing & Varnishing',
        description: 'Polishing and varnishing services for doors, furniture, and wooden flooring.',
        serviceGroups: [
          {
            name: 'Furniture Polishing',
            description: 'Sanding and two-coat polishing for wooden furniture.',
            bullets: ['Includes sanding & 2 coats of polish', 'PU & melamine finish options', 'Dust-free curing environment'],
            services: [
              { name: 'Wooden furniture polishing (small item)', addOns: [{ name: 'PU coating upgrade', price: 799 }] },
              { name: 'Wooden furniture polishing (large item)' },
              { name: 'Dining table/bed polishing' },
            ],
          },
          {
            name: 'Door & Floor Varnishing',
            description: 'Weather-resistant varnishing for wooden doors and flooring.',
            bullets: ['Weather-resistant varnish used', 'Includes minor scratch repair', '24-48 hour curing time'],
            services: [
              { name: 'Wooden door varnishing', addOns: [{ name: 'Scratch & dent repair', price: 499 }] },
              { name: 'Wooden flooring varnishing' },
              { name: 'Window frame varnishing' },
            ],
          },
        ],
      },
      {
        name: 'Wall Texture Design',
        description: 'Decorative texture and stencil finishes for accent walls.',
        serviceGroups: [
          {
            name: 'Texture Finishes',
            description: 'Decorative texture patterns and 3D finishes for accent walls.',
            bullets: ['Wide range of texture patterns', 'Includes base coat & design application', 'Suitable for living rooms & bedrooms'],
            services: [
              { name: 'Textured accent wall (per wall)', addOns: [{ name: 'Metallic finish upgrade', price: 1499 }] },
              { name: 'Stencil design wall art' },
              { name: '3D texture wall panel finish' },
            ],
          },
          {
            name: 'Stencil & Mural Art',
            description: 'Custom stencil and hand-painted mural designs for feature walls.',
            bullets: ['Custom stencil designs available', 'Hand-painted mural options', "Ideal for kids' rooms & feature walls"],
            services: [
              { name: 'Stencil wall art (per wall)', addOns: [{ name: 'Custom design consultation', price: 499 }] },
              { name: 'Hand-painted mural (per wall)' },
              { name: 'Geometric pattern wall art' },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Wall Panels & Home Décor',
    description: 'Decorative wall panels, wallpaper, false ceiling, and lighting installation services.',
    subcategories: [
      {
        name: 'PVC & WPC Wall Panels',
        description: 'Waterproof PVC and WPC panel installation for walls and ceilings.',
        serviceGroups: [
          {
            name: 'PVC Wall Panels',
            description: 'Waterproof, termite-resistant PVC panel installation for walls and ceilings.',
            bullets: ['Waterproof & termite-resistant material', 'Includes measurement & fitting', 'Wide range of finishes available'],
            services: [
              { name: 'PVC wall panel installation (per wall)', addOns: [{ name: 'LED strip lighting add-on', price: 999 }] },
              { name: 'PVC panel ceiling installation' },
              { name: 'PVC panel bathroom wall cladding' },
            ],
          },
          {
            name: 'WPC Louvers & Cladding',
            description: 'Premium wood-finish WPC louver and cladding installation.',
            bullets: ['Premium wood-finish WPC material', 'Low maintenance, moisture resistant', 'Includes frame & fitting'],
            services: [
              { name: 'WPC louver wall installation', addOns: [{ name: 'Custom colour finish', price: 799 }] },
              { name: 'WPC wall cladding (per wall)' },
              { name: 'WPC panel ceiling border' },
            ],
          },
        ],
      },
      {
        name: 'Wallpaper Installation',
        description: 'Wallpaper supply and installation for feature walls and full rooms.',
        serviceGroups: [
          {
            name: 'Feature Wall Wallpaper',
            description: 'Bubble-free wallpaper installation for feature walls.',
            bullets: ['Includes surface prep & primer', 'Wide catalogue of designs', 'Bubble-free installation guarantee'],
            services: [
              { name: 'Wallpaper installation (per wall, up to 100 sqft)', addOns: [{ name: '3D wallpaper upgrade', price: 1499 }] },
              { name: 'Wallpaper installation (per wall, above 100 sqft)' },
              { name: 'Kids room themed wallpaper' },
            ],
          },
          {
            name: 'Full Room Wallpaper',
            description: 'Complete room wallpaper installation with old wallpaper removal.',
            bullets: ['Covers all walls in the room', 'Includes old wallpaper removal', 'Premium imported options available'],
            services: [
              { name: 'Full room wallpaper installation (small room)', addOns: [{ name: 'Old wallpaper removal', price: 999 }] },
              { name: 'Full room wallpaper installation (large room)' },
              { name: 'Textured wallpaper (per wall)' },
            ],
          },
        ],
      },
      {
        name: 'False Ceiling',
        description: 'POP and gypsum false ceiling design and installation.',
        serviceGroups: [
          {
            name: 'POP False Ceiling',
            description: 'POP false ceiling with framework, finishing, and lighting cutouts.',
            bullets: ['Includes framework & finishing', 'Recessed lighting cutouts included', 'Suitable for living & bedrooms'],
            services: [
              { name: 'POP false ceiling (per room, simple design)', addOns: [{ name: 'Cove lighting add-on', price: 1999 }] },
              { name: 'POP false ceiling (per room, designer)' },
              { name: 'POP ceiling border/cornice work' },
            ],
          },
          {
            name: 'Gypsum Board Ceiling',
            description: 'Lightweight gypsum board ceiling installation and repair.',
            bullets: ['Lightweight & moisture-resistant boards', 'Faster installation than POP', 'Includes framework & finishing'],
            services: [
              { name: 'Gypsum board false ceiling (per room)', addOns: [{ name: 'LED panel light fitting', price: 1299 }] },
              { name: 'Gypsum ceiling repair' },
              { name: 'False ceiling with cove design' },
            ],
          },
        ],
      },
      {
        name: 'Decorative Lighting',
        description: 'Ambient and accent lighting installation for homes.',
        serviceGroups: [
          {
            name: 'LED Strip & Cove Lighting',
            description: 'LED cove and strip lighting installation with wiring and driver box.',
            bullets: ['Includes wiring & driver box', 'Warm/cool white & RGB options', 'Remote/app control available'],
            services: [
              { name: 'LED cove lighting installation (per room)', addOns: [{ name: 'Smart app control upgrade', price: 899 }] },
              { name: 'LED strip lighting (per wall/shelf)' },
              { name: 'Chandelier installation' },
            ],
          },
          {
            name: 'Outdoor & Balcony Lighting',
            description: 'Weatherproof outdoor and balcony lighting installation.',
            bullets: ['Weatherproof fixtures used', 'Includes wiring & mounting', 'Solar options available'],
            services: [
              { name: 'Balcony/garden string lighting', addOns: [{ name: 'Solar panel upgrade', price: 1499 }] },
              { name: 'Outdoor wall light installation' },
              { name: 'Pathway light installation' },
            ],
          },
        ],
      },
      {
        name: 'Curtains & Blinds',
        description: 'Curtain rod, blind, and window treatment installation.',
        serviceGroups: [
          {
            name: 'Curtain Installation',
            description: 'Curtain rod and track fitting with measurement service.',
            bullets: ['Includes rod/track fitting', 'Measurement service included', 'Suitable for all window sizes'],
            services: [
              { name: 'Curtain rod installation (per window)', addOns: [{ name: 'Motorized curtain track upgrade', price: 2999 }] },
              { name: 'Curtain stitching & hanging (per window)' },
              { name: 'Sheer + blackout double layer setup' },
            ],
          },
          {
            name: 'Blinds & Window Films',
            description: 'Roller, roman, and vertical blind installation with window films.',
            bullets: ['Roller, roman & vertical blind options', 'Includes bracket & motor fitting where applicable', 'Privacy window films available'],
            services: [
              { name: 'Roller/roman blind installation (per window)', addOns: [{ name: 'Motorized blind upgrade', price: 2499 }] },
              { name: 'Privacy window film installation' },
              { name: 'Motorized smart blind setup' },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Native Smart Products',
    description: 'Smart home devices and installation services for water purification, security, and automation.',
    subcategories: [
      {
        name: 'Smart Water Purifiers',
        description: 'RO/UV water purifier installation, service, and AMC plans.',
        serviceGroups: [
          {
            name: 'Installation Services',
            description: 'Water purifier installation, filter change, and repair.',
            bullets: ['Includes tap & drainage connection', 'Free demo on usage & filter change', 'Applicable for RO/UV/UF purifiers'],
            services: [
              { name: 'Water purifier installation', addOns: [{ name: 'Extra tap installation', price: 299 }] },
              { name: 'Water purifier service & filter change' },
              { name: 'Water purifier repair - no water flow' },
              { name: 'Water purifier AMC plan enrollment' },
            ],
          },
          {
            name: 'Purifier Devices',
            description: 'RO/UV/UF water purifier devices with installation included.',
            bullets: ['Includes 1-year manufacturer warranty', 'Free installation included with purchase', '6-stage or 7-stage filtration options'],
            services: [
              { name: 'RO+UV+UF smart water purifier (device)', addOns: [{ name: 'Annual maintenance contract', price: 1999 }] },
              { name: 'Alkaline RO water purifier (device)' },
              { name: 'Copper RO water purifier (device)' },
            ],
          },
        ],
      },
      {
        name: 'Smart Locks',
        description: 'Fingerprint and app-controlled smart lock devices and installation.',
        serviceGroups: [
          {
            name: 'Installation Services',
            description: 'Smart lock fitting and battery/service checks on existing doors.',
            bullets: ['Includes drilling & fitting on existing door', 'Compatible with wooden & metal doors', 'App setup & demo included'],
            services: [
              { name: 'Smart lock installation', addOns: [{ name: 'Extra fingerprint/card enrolment', price: 199 }] },
              { name: 'Smart lock battery/service check' },
              { name: 'Video doorbell + smart lock combo installation' },
            ],
          },
          {
            name: 'Smart Lock Devices',
            description: 'Fingerprint and PIN-based smart door lock devices.',
            bullets: ['Fingerprint, PIN & app unlock options', 'Includes 1-year device warranty', 'Free installation with purchase'],
            services: [
              { name: 'Fingerprint smart door lock (device)', addOns: [{ name: 'Extra remote key fob', price: 499 }] },
              { name: 'PIN + card smart door lock (device)' },
              { name: 'Smart lock with camera (device)' },
            ],
          },
        ],
      },
      {
        name: 'Smart Cameras & Video Doorbells',
        description: 'CCTV camera and video doorbell installation for home security.',
        serviceGroups: [
          {
            name: 'Installation Services',
            description: 'Camera and video doorbell installation with app configuration.',
            bullets: ['Includes wiring & app configuration', 'Cloud & local storage setup options', 'Night vision alignment check'],
            services: [
              { name: 'Indoor smart camera installation (per unit)', addOns: [{ name: 'Cloud storage subscription (1 yr)', price: 999 }] },
              { name: 'Outdoor smart camera installation (per unit)' },
              { name: 'Video doorbell installation' },
            ],
          },
          {
            name: 'Camera Devices',
            description: '1080p/2K smart cameras and video doorbells with two-way audio.',
            bullets: ['1080p/2K resolution options', 'Two-way audio & night vision', 'Free installation with purchase'],
            services: [
              { name: '2K WiFi smart camera (device)', addOns: [{ name: '128GB SD card add-on', price: 899 }] },
              { name: 'Smart video doorbell (device)' },
              { name: '4-camera CCTV kit (device)' },
            ],
          },
        ],
      },
      {
        name: 'Smart Lighting',
        description: 'App and voice-controlled smart lighting devices and setup.',
        serviceGroups: [
          {
            name: 'Installation Services',
            description: 'Smart bulb and switchboard setup with app/voice pairing.',
            bullets: ['Includes wiring compatibility check', 'App & voice assistant pairing included', 'Group/scene setup included'],
            services: [
              { name: 'Smart bulb setup & pairing (per unit)', addOns: [{ name: 'Voice assistant integration', price: 299 }] },
              { name: 'Smart switchboard installation' },
              { name: 'Smart doorbell chime installation' },
            ],
          },
          {
            name: 'Smart Lighting Devices',
            description: 'WiFi-enabled smart bulbs and switch modules.',
            bullets: ['Compatible with Alexa & Google Home', '16M colour options on select models', 'Free setup with purchase'],
            services: [
              { name: 'Smart WiFi bulb - colour (device)', addOns: [{ name: 'Smart plug bundle', price: 599 }] },
              { name: 'Smart WiFi switch module (device)' },
              { name: 'Smart LED strip light (device)' },
            ],
          },
        ],
      },
      {
        name: 'Smart Switches & Modules',
        description: 'Retrofit smart switch and automation module installation.',
        serviceGroups: [
          {
            name: 'Installation Services',
            description: 'Retrofit smart switch and curtain motor installation.',
            bullets: ['Retrofits onto existing switchboards', 'No major rewiring needed', 'App & voice pairing included'],
            services: [
              { name: 'Smart switch module installation (per board)', addOns: [{ name: 'Extra module (per switch)', price: 399 }] },
              { name: 'Smart curtain motor installation' },
              { name: 'Home automation consultation & setup' },
            ],
          },
          {
            name: 'Automation Devices',
            description: 'Smart switch panels, curtain motors, and smart plugs.',
            bullets: ['Works with existing wiring in most cases', 'App-based scheduling & scenes', 'Free setup with purchase'],
            services: [
              { name: '4-module smart switch panel (device)', addOns: [{ name: 'Smart hub bundle', price: 1499 }] },
              { name: 'Smart curtain motor (device)' },
              { name: 'Smart plug (device, pack of 2)' },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Packers & Movers',
    description: 'Home and office relocation services including packing, loading, and transportation.',
    subcategories: [
      {
        name: 'Local Home Shifting',
        description: 'Within-city home relocation services for apartments of all sizes.',
        serviceGroups: [
          {
            name: 'Studio/1BHK Shifting',
            description: 'Local relocation for studio apartments and 1 BHK homes.',
            bullets: ['Includes packing material & labour', 'Loading/unloading included', 'Basic transit insurance included'],
            services: [
              { name: 'Studio apartment shifting (local)', addOns: [{ name: 'Extra packing material', price: 499 }] },
              { name: '1 BHK shifting (local)' },
              { name: '1 BHK shifting with 2 helpers' },
            ],
          },
          {
            name: '2BHK+/Villa Shifting',
            description: 'Local relocation for larger homes with furniture dismantling.',
            bullets: ['Includes furniture dismantling & reassembly', 'Loading/unloading included', 'Basic transit insurance included'],
            services: [
              { name: '2 BHK shifting (local)', addOns: [{ name: 'Furniture dismantling & reassembly', price: 999 }] },
              { name: '3 BHK shifting (local)' },
              { name: 'Villa/independent house shifting (local)' },
            ],
          },
        ],
      },
      {
        name: 'Intercity Relocation',
        description: 'Long-distance home relocation across cities with door-to-door service.',
        serviceGroups: [
          {
            name: '1BHK/2BHK Intercity',
            description: 'Door-to-door intercity relocation for smaller homes.',
            bullets: ['Door-to-door transportation', 'Includes packing & unpacking', 'Transit insurance included'],
            services: [
              { name: '1 BHK intercity relocation', addOns: [{ name: 'Enhanced transit insurance', price: 1499 }] },
              { name: '2 BHK intercity relocation' },
              { name: '2 BHK intercity relocation (express, 3-day)' },
            ],
          },
          {
            name: '3BHK+/Villa Intercity',
            description: 'Coordinated intercity relocation for larger homes and villas.',
            bullets: ['Dedicated relocation coordinator', 'Includes furniture dismantling & reassembly', 'Transit insurance included'],
            services: [
              { name: '3 BHK intercity relocation', addOns: [{ name: 'Enhanced transit insurance', price: 2499 }] },
              { name: 'Villa/independent house intercity relocation' },
              { name: '4 BHK intercity relocation' },
            ],
          },
        ],
      },
      {
        name: 'Vehicle Transportation',
        description: 'Car and two-wheeler transportation services between cities.',
        serviceGroups: [
          {
            name: 'Car Transportation',
            description: 'Open and enclosed carrier transportation for cars.',
            bullets: ['Enclosed & open carrier options', 'Includes pre-transport inspection report', 'Insurance coverage included'],
            services: [
              { name: 'Car transportation - open carrier', addOns: [{ name: 'Enclosed carrier upgrade', price: 2999 }] },
              { name: 'Car transportation - enclosed carrier' },
              { name: 'Car transportation - two-wheeler combo' },
            ],
          },
          {
            name: 'Bike Transportation',
            description: 'Crated bike and scooter transportation with door-to-door pickup.',
            bullets: ['Secure crating for transit', 'Door-to-door pickup & delivery', 'Insurance coverage included'],
            services: [
              { name: 'Bike transportation (within state)', addOns: [{ name: 'Insurance coverage upgrade', price: 499 }] },
              { name: 'Bike transportation (interstate)' },
              { name: 'Scooter/moped transportation' },
            ],
          },
        ],
      },
      {
        name: 'Office Relocation',
        description: 'Office and commercial relocation including IT equipment handling.',
        serviceGroups: [
          {
            name: 'Small Office Relocation',
            description: 'Relocation for small offices including IT equipment.',
            bullets: ['Includes furniture & equipment packing', 'IT equipment handled with care', 'Weekend relocation slots available'],
            services: [
              { name: 'Small office relocation (up to 10 seats)', addOns: [{ name: 'IT equipment specialised packing', price: 1999 }] },
              { name: 'Server/IT equipment relocation' },
              { name: 'Office furniture disposal service' },
            ],
          },
          {
            name: 'Large Office Relocation',
            description: 'Coordinated relocation for larger offices and warehouses.',
            bullets: ['Dedicated project coordinator', 'Includes dismantling & reassembly of workstations', 'Minimal downtime planning'],
            services: [
              { name: 'Large office relocation (10-30 seats)', addOns: [{ name: 'Weekend/after-hours relocation', price: 2999 }] },
              { name: 'Warehouse/inventory relocation' },
              { name: 'Retail store relocation' },
            ],
          },
        ],
      },
      {
        name: 'Packing & Loading Only',
        description: 'Standalone packing, loading, or unloading services without transportation.',
        serviceGroups: [
          {
            name: 'Packing Services',
            description: 'Standalone packing service with premium materials and labelling.',
            bullets: ['Premium packing materials used', 'Fragile items given extra padding', 'Labelling for easy unpacking'],
            services: [
              { name: 'Full home packing only (1-2 BHK)', addOns: [{ name: 'Fragile item extra padding', price: 399 }] },
              { name: 'Full home packing only (3 BHK+)' },
              { name: 'Kitchen & fragile items packing only' },
            ],
          },
          {
            name: 'Loading & Unloading',
            description: 'Standalone loading and unloading labour with equipment.',
            bullets: ['Skilled labour with equipment', 'Safe handling of heavy furniture', 'Available same-day'],
            services: [
              { name: 'Loading & unloading (per truck)', addOns: [{ name: 'Extra labour (per person)', price: 399 }] },
              { name: 'Unloading only service' },
              { name: 'Vehicle with driver only (self-loading)' },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Home Renovation & Interior Design',
    description: 'End-to-end interior design and renovation services for kitchens, bathrooms, and full homes.',
    subcategories: [
      {
        name: 'Modular Kitchen',
        description: 'Modular kitchen design, fabrication, and fitting services.',
        serviceGroups: [
          {
            name: 'Kitchen Design Packages',
            description: 'L-shaped and straight-layout modular kitchen design packages.',
            bullets: ['Includes 3D design consultation', 'Choice of laminate, acrylic or PU finish', 'Site measurement included'],
            services: [
              { name: 'Modular kitchen - L-shaped (basic)', addOns: [{ name: 'Premium finish upgrade', price: 14999 }] },
              { name: 'Modular kitchen - L-shaped (premium)' },
              { name: 'Modular kitchen - straight/parallel layout' },
            ],
          },
          {
            name: 'Kitchen Fittings & Accessories',
            description: 'Cabinet, countertop, and accessory installation for modular kitchens.',
            bullets: ['Includes installation & fitting', 'Wide range of hardware brands', 'Soft-close mechanisms available'],
            services: [
              { name: 'Kitchen cabinet installation (per unit)', addOns: [{ name: 'Soft-close hinge upgrade', price: 999 }] },
              { name: 'Kitchen countertop installation' },
              { name: 'Modular kitchen accessories fitting (baskets, racks)' },
            ],
          },
        ],
      },
      {
        name: 'Full Home Interior Design',
        description: 'Complete interior design consultation and execution for entire homes.',
        serviceGroups: [
          {
            name: 'Design Consultation Packages',
            description: '3D design consultation packages with a dedicated design consultant.',
            bullets: ['Includes 3D design & floor plan', 'Dedicated design consultant assigned', '2-3 design revisions included'],
            services: [
              { name: 'Interior design consultation - 1 BHK', addOns: [{ name: 'Extra design revision', price: 1999 }] },
              { name: 'Interior design consultation - 2 BHK' },
              { name: 'Interior design consultation - 3 BHK+' },
            ],
          },
          {
            name: 'Full Execution Packages',
            description: 'End-to-end interior execution covering civil, electrical, and carpentry work.',
            bullets: ['End-to-end project management', 'Includes civil, electrical & carpentry work', 'Quality checks at each milestone'],
            services: [
              { name: 'Full home interior execution - 2 BHK', addOns: [{ name: 'Premium material upgrade', price: 24999 }] },
              { name: 'Full home interior execution - 3 BHK' },
              { name: 'Full home interior execution - 4 BHK/villa' },
            ],
          },
        ],
      },
      {
        name: 'False Ceiling & POP Work',
        description: 'Structural false ceiling and POP design work for renovation projects.',
        serviceGroups: [
          {
            name: 'Design & Consultation',
            description: 'False ceiling and POP design consultation with 3D visualization.',
            bullets: ['Includes design concept & estimate', 'Site visit & measurement included', '3D visualization available'],
            services: [
              { name: 'False ceiling design consultation', addOns: [{ name: '3D visualization add-on', price: 999 }] },
              { name: 'POP cornice & border design consultation' },
              { name: 'Kitchen ceiling design consultation' },
            ],
          },
          {
            name: 'Renovation Execution',
            description: 'False ceiling renovation execution including old ceiling removal.',
            bullets: ['Includes material & labour', 'Old ceiling removal if applicable', 'Quality finish guarantee'],
            services: [
              { name: 'Living room false ceiling renovation', addOns: [{ name: 'Cove lighting upgrade', price: 1999 }] },
              { name: 'Multi-room false ceiling renovation' },
              { name: 'Bedroom false ceiling renovation' },
            ],
          },
        ],
      },
      {
        name: 'Bathroom Renovation',
        description: 'Full and partial bathroom renovation including tiling and fittings.',
        serviceGroups: [
          {
            name: 'Renovation Packages',
            description: 'Basic and premium bathroom renovation packages with waterproofing.',
            bullets: ['Includes tiling, plumbing & fittings', 'Waterproofing included', 'Design consultation included'],
            services: [
              { name: 'Bathroom renovation - basic package', addOns: [{ name: 'Premium fittings upgrade', price: 7999 }] },
              { name: 'Bathroom renovation - premium package' },
              { name: 'Half bathroom renovation (fittings only)' },
            ],
          },
          {
            name: 'Fittings & Fixtures',
            description: 'Bathroom fixture replacement and tiling with brand selection.',
            bullets: ['Includes installation & sealing', 'Wide brand selection available', 'Old fixture removal included'],
            services: [
              { name: 'Bathroom fixture replacement (basin/WC/shower)', addOns: [{ name: 'Extra fixture (per unit)', price: 1499 }] },
              { name: 'Bathroom tiling (per 100 sqft)' },
              { name: 'Bathroom accessories installation (towel rod, mirror etc.)' },
            ],
          },
        ],
      },
      {
        name: 'Wardrobe & Storage Design',
        description: 'Custom wardrobe and storage unit design and fabrication.',
        serviceGroups: [
          {
            name: 'Wardrobe Design',
            description: 'Sliding, hinged, and walk-in wardrobe design with 3D visualization.',
            bullets: ['Includes 3D design & material selection', 'Sliding & hinged door options', 'Interior organizer accessories available'],
            services: [
              { name: 'Sliding wardrobe design & fitting', addOns: [{ name: 'Interior organizer add-on', price: 2999 }] },
              { name: 'Hinged door wardrobe design & fitting' },
              { name: 'Walk-in closet design & fitting' },
            ],
          },
          {
            name: 'Storage Units',
            description: 'Custom-built TV units, storage cabinets, and study units.',
            bullets: ['Custom-built to space dimensions', 'Includes installation & hardware', 'Choice of finishes available'],
            services: [
              { name: 'TV unit & storage cabinet design', addOns: [{ name: 'Extra storage module', price: 1999 }] },
              { name: 'Study/home office unit design' },
              { name: 'Shoe rack & entryway storage design' },
            ],
          },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Admin resolution — createdBy is required on every catalog model. There is no seed
// data for Admin (see scripts/seedRootAdmin.js), so this either uses SEED_ADMIN_ID if
// set, or falls back to the oldest existing Admin document.
// ─────────────────────────────────────────────────────────────────────────────
const resolveAdminId = async () => {
  const seedAdminId = process.env.SEED_ADMIN_ID || '';

  if (seedAdminId) {
    const admin = await Admin.findById(seedAdminId);
    if (!admin) {
      throw new Error(`SEED_ADMIN_ID="${seedAdminId}" does not match any Admin document.`);
    }
    return admin._id;
  }

  const admin = await Admin.findOne().sort({ createdAt: 1 });
  if (!admin) {
    throw new Error(
      [
        'No Admin document found and SEED_ADMIN_ID is not set.',
        'Create one first:',
        '  node scripts/seedRootAdmin.js --email you@example.com --username rootadmin',
        'Then re-run this script (optionally pinning the admin via SEED_ADMIN_ID=<id> node scripts/seedCatalog.js).',
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

    console.log('Wiping existing catalog collections (Category, Subcategory, ServiceGroup, Service, AddOn)...');
    await Promise.all([
      Category.deleteMany({}),
      Subcategory.deleteMany({}),
      ServiceGroup.deleteMany({}),
      Service.deleteMany({}),
      AddOn.deleteMany({}),
    ]);
    console.log('Wiped.\n');

    const expected = { categories: 0, subcategories: 0, serviceGroups: 0, services: 0, addOns: 0 };

    const categoriesToSeed = CATALOG.slice(0, CATEGORY_LIMIT);

    for (const [catIndex, catData] of categoriesToSeed.entries()) {
      const category = await Category.create({
        name: catData.name,
        description: catData.description,
        image: placeholderImage(`category-${catIndex}`),
        sortOrder: catIndex,
        isActive: randomIsActive(),
        createdBy,
      });
      expected.categories += 1;

      const categoryMeta = CATEGORY_META[catData.name];
      if (!categoryMeta) {
        throw new Error(`No CATEGORY_META price/duration band defined for category "${catData.name}"`);
      }

      const subcategoriesToSeed = catData.subcategories.slice(0, SUBCATEGORY_PER_CATEGORY_LIMIT);
      for (const [subIndex, subData] of subcategoriesToSeed.entries()) {
        const subcategory = await Subcategory.create({
          name: subData.name,
          description: subData.description,
          image: placeholderImage(`subcategory-${catIndex}-${subIndex}`),
          category: category._id,
          sortOrder: subIndex,
          isActive: randomIsActive(),
          createdBy,
        });
        expected.subcategories += 1;

        const groupsToSeed = subData.serviceGroups.slice(0, SERVICE_GROUP_PER_SUBCATEGORY_LIMIT);
        for (const [groupIndex, groupData] of groupsToSeed.entries()) {
          const serviceGroup = await ServiceGroup.create({
            name: groupData.name,
            description: groupData.description,
            image: placeholderImage(`servicegroup-${catIndex}-${subIndex}-${groupIndex}`),
            subcategory: subcategory._id,
            sortOrder: groupIndex,
            isActive: randomIsActive(),
            createdBy,
          });
          expected.serviceGroups += 1;

          const servicesToSeed = groupData.services.slice(0, SERVICES_PER_GROUP_LIMIT);
          for (const [svcIndex, svcData] of servicesToSeed.entries()) {
            const price = nicePrice(categoryMeta.priceRange[0], categoryMeta.priceRange[1]);
            const service = await Service.create({
              name: svcData.name,
              description: buildDescription(svcData.name),
              price,
              mrp: withMrp(price),
              durationMins: niceDuration(categoryMeta.durationRange[0], categoryMeta.durationRange[1]),
              bullets: groupData.bullets,
              images: [placeholderImage(`service-${catIndex}-${subIndex}-${groupIndex}-${svcIndex}`)],
              rating: { average: randomRating(), count: randomReviewCount() },
              serviceGroup: serviceGroup._id,
              sortOrder: svcIndex,
              isActive: randomIsActive(),
              createdBy,
            });
            expected.services += 1;

            const addOnsToSeed = (svcData.addOns || []).slice(0, ADDONS_PER_SERVICE_LIMIT);
            for (const addOnData of addOnsToSeed) {
              await AddOn.create({
                name: addOnData.name,
                price: addOnData.price,
                image: placeholderImage(`addon-${service._id}`),
                service: service._id,
                isActive: randomIsActive(),
                createdBy,
              });
              expected.addOns += 1;
            }
          }
        }
      }

      console.log(
        `Created category ${catIndex + 1}/${categoriesToSeed.length} "${category.name}" ` +
          `(running totals — subcategories: ${expected.subcategories}, service groups: ${expected.serviceGroups}, ` +
          `services: ${expected.services}, add-ons: ${expected.addOns})`
      );
    }

    console.log('\nSeed complete. Expected counts (created by this run):');
    console.table(expected);

    console.log('\nVerifying against actual database counts...');
    const [catCount, subCount, groupCount, svcCount, addOnCount] = await Promise.all([
      Category.countDocuments(),
      Subcategory.countDocuments(),
      ServiceGroup.countDocuments(),
      Service.countDocuments(),
      AddOn.countDocuments(),
    ]);

    const actual = {
      categories: catCount,
      subcategories: subCount,
      serviceGroups: groupCount,
      services: svcCount,
      addOns: addOnCount,
    };
    console.table(actual);

    const mismatches = Object.keys(expected).filter((key) => expected[key] !== actual[key]);
    if (mismatches.length > 0) {
      console.error(
        `\nMISMATCH detected for: ${mismatches.join(', ')}. Some inserts may have failed silently — investigate before trusting this data.`
      );
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

