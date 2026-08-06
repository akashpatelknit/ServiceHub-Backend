// Standalone demo-data seed script for the transactional layer built on top of the
// catalog + user-management modules: Cart, CustomerOrder (ServiceOrder + ProductOrder
// discriminators), and Payment. Run with: node scripts/seedOrders.js
//
// Connects to the same MongoDB the running app uses (config.DATABASE_URL / DB_NAME,
// same as seedUsers.js/seedCatalog.js), and inserts via the real Mongoose models —
// including CustomerOrder.generateOrderNumber() — so the orderNumber Counter sequence
// and every schema hook run exactly as they do in the live app.
//
// Requires:
//   - At least one User (customer). Pin a specific one with SEED_USER_EMAIL=<email>;
//     otherwise falls back to the oldest existing User. Run `node scripts/seedUsers.js`
//     first if none exist.
//   - At least one active CatalogService. Run `node scripts/seedCatalog.js` first if
//     none exist.
//   - At least one active Product. Run `node scripts/seedProducts.js` first if none
//     exist — that script owns Product/ProductCategory demo data now, this one just
//     reads whatever's there.
//   - Vendor: optional. If none exist, ServiceOrders that would otherwise be
//     assigned/in-progress/completed are left unassigned instead of erroring.
//
// Wipes only THIS customer's existing dummy data — their Cart, their CustomerOrder
// docs (both discriminators), and the Payment docs those orders point at. Never
// touches User/Address/Service/Product/Vendor data, or any other customer's orders.

import mongoose from 'mongoose';
import config from '../src/config/config.js';
import { DB_NAME } from '../src/constants/constants.js';
import { User, Vendor } from '../src/core/models/index.js';
import { Address } from '../src/features/address/models/address.model.js';
import { Service as CatalogService, AddOn as CatalogAddOn } from '../src/features/service-catalog/models/index.js';
import { Product } from '../src/models/product.model.js';
import { Cart } from '../src/features/cart/models/cart.model.js';
import { CustomerOrder } from '../src/features/order-core/index.js';
import { ServiceOrder } from '../src/features/service-booking/index.js';
import { ProductOrder } from '../src/features/product-order/index.js';
import { Payment } from '../src/features/payment/index.js';

const maskConnectionString = (uri) => (uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : uri);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randomInt(0, arr.length - 1)];
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const hoursAfter = (date, h) => new Date(date.getTime() + h * 60 * 60 * 1000);

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
      [
        'No User document found and SEED_USER_EMAIL is not set.',
        'Create some first:',
        '  node scripts/seedUsers.js',
        'Then re-run this script (optionally pinning the customer via SEED_USER_EMAIL=<email> node scripts/seedOrders.js).',
      ].join('\n')
    );
  }
  return user;
};

const buildAddressSnapshot = (address, user) =>
  address
    ? {
        fullAddress: address.completeAddress,
        city: address.city,
        state: address.state,
        pincode: address.pinCode,
        geolocation: address.geolocation,
        label: address.label,
      }
    : {
        fullAddress: `${user.firstName || 'Customer'}'s home, 12th Main Road, Indiranagar`,
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        geolocation: { lat: 12.9716, lng: 77.5946 },
        label: 'Home',
      };

// Walks the real happy-path chain up to (and including) `targetStatus`, a few hours
// apart per step, so the admin status-history timeline has something realistic to
// render — never just a single entry. `cancelled` branches off partway through;
// `returned` walks the full happy path and then branches past the end.
const buildStatusHistory = (happyPath, targetStatus, startDate, userId) => {
  if (targetStatus === 'cancelled') {
    const cutoff = Math.random() < 0.5 ? 0 : 1; // cancelled from pending or confirmed
    const history = happyPath.slice(0, cutoff + 1).map((status, i) => ({
      status,
      changedAt: hoursAfter(startDate, i * 3),
      changedBy: i === 0 ? userId : null,
      changedByModel: i === 0 ? 'User' : 'System',
    }));
    history.push({ status: 'cancelled', changedAt: hoursAfter(startDate, (cutoff + 1) * 3), changedBy: userId, changedByModel: 'User' });
    return history;
  }

  if (targetStatus === 'returned') {
    const history = happyPath.map((status, i) => ({
      status,
      changedAt: hoursAfter(startDate, i * 6),
      changedBy: i === 0 ? userId : null,
      changedByModel: i === 0 ? 'User' : 'System',
    }));
    history.push({ status: 'returned', changedAt: hoursAfter(startDate, happyPath.length * 6), changedBy: null, changedByModel: 'System' });
    return history;
  }

  const targetIndex = happyPath.indexOf(targetStatus);
  return happyPath.slice(0, targetIndex + 1).map((status, i) => ({
    status,
    changedAt: hoursAfter(startDate, i * 4),
    changedBy: i === 0 ? userId : null,
    changedByModel: i === 0 ? 'User' : 'System',
  }));
};

const SERVICE_HAPPY_PATH = ['pending', 'confirmed', 'assigned', 'in-progress', 'completed'];
const SERVICE_STATUSES = ['pending', 'confirmed', 'assigned', 'in-progress', 'completed', 'cancelled'];

const PRODUCT_HAPPY_PATH = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];
const PRODUCT_STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'];
const SHIPPING_STATUS_FOR = { packed: 'shipment-created', shipped: 'in-transit', delivered: 'delivered', returned: 'delivered' };

const main = async () => {
  console.log(`Using DATABASE_URL from environment (masked): ${maskConnectionString(config.DATABASE_URL)}`);
  console.log(`Target database name: ${DB_NAME}\n`);

  const connection = await mongoose.connect(config.DATABASE_URL, { dbName: DB_NAME });
  console.log(`Connected. DB HOST: ${connection.connection.host}\n`);

  try {
    const customer = await resolveCustomer();
    console.log(`Seeding orders for customer: ${customer.firstName} ${customer.lastName} <${customer.email}> (_id ${customer._id})\n`);

    const address = await Address.findOne({ owner: customer._id, ownerType: 'User' }).sort({ isDefault: -1 });
    if (!address) console.log('No existing Address found for this customer — using a placeholder address snapshot.\n');

    const services = await CatalogService.find({ isActive: true }).limit(30);
    if (services.length === 0) {
      throw new Error('No active CatalogService documents found. Run `node scripts/seedCatalog.js` first.');
    }

    const products = await Product.find({ isActive: true, isDeleted: { $ne: true } }).limit(30);
    if (products.length === 0) {
      throw new Error('No active Product documents found. Run `node scripts/seedProducts.js` first.');
    }

    const vendors = await Vendor.find().limit(10);
    if (vendors.length === 0) console.log('No Vendor documents found — assigned/in-progress/completed ServiceOrders will be left unassigned.\n');

    const existingOrders = await CustomerOrder.find({ user: customer._id }).select('_id paymentId');
    const existingPaymentIds = existingOrders.map((o) => o.paymentId).filter(Boolean);
    console.log(
      `Wiping this customer's existing dummy data — ${existingOrders.length} order(s), ${existingPaymentIds.length} payment(s), their cart...`
    );
    await Promise.all([
      Cart.deleteMany({ user: customer._id }),
      CustomerOrder.deleteMany({ user: customer._id }),
      Payment.deleteMany({ _id: { $in: existingPaymentIds } }),
    ]);
    console.log('Wiped.\n');

    // ── Live cart (not checked out) ────────────────────────────────────────────
    console.log('Creating a live Cart (not checked out)...');
    const cartService = pick(services);
    const cartServiceAddon = await CatalogAddOn.findOne({ service: cartService._id, isActive: true });
    const cart = await Cart.create({
      user: customer._id,
      items: [
        {
          itemType: 'service',
          refId: cartService._id,
          quantity: 1,
          selectedAddons: cartServiceAddon ? [cartServiceAddon._id] : [],
          addedAt: daysAgo(0),
        },
        { itemType: 'service', refId: pick(services)._id, quantity: 1, selectedAddons: [], addedAt: daysAgo(0) },
        { itemType: 'product', refId: pick(products)._id, quantity: 2, addedAt: daysAgo(0) },
      ],
    });
    console.log(`  Cart ${cart._id} created with ${cart.items.length} item(s).\n`);

    // ── ServiceOrders, one per status ──────────────────────────────────────────
    console.log('Creating ServiceOrders (one per status)...');
    const createdServiceOrders = [];
    for (const [i, targetStatus] of SERVICE_STATUSES.entries()) {
      const orderServices = [pick(services)];
      if (Math.random() < 0.4) orderServices.push(pick(services));

      const items = [];
      for (const svc of orderServices) {
        const addons = await CatalogAddOn.find({ service: svc._id, isActive: true }).limit(2);
        items.push({
          serviceId: svc._id,
          serviceNameSnapshot: svc.name,
          priceSnapshot: svc.price,
          durationSnapshot: svc.durationMins,
          addonsSnapshot: addons.map((a) => ({ name: a.name, price: a.price })),
        });
      }

      const totalAmount = items.reduce((sum, it) => sum + it.priceSnapshot + it.addonsSnapshot.reduce((s, a) => s + a.price, 0), 0);
      const paymentStatus = targetStatus === 'pending' ? 'pending' : targetStatus === 'cancelled' ? 'failed' : 'paid';

      const payment = await Payment.create({
        purposeType: 'CustomerOrder',
        amount: totalAmount,
        status: paymentStatus === 'pending' ? 'created' : paymentStatus,
        gateway: 'razorpay',
        gatewayOrderId: `order_DEMOSRV${Date.now()}${i}`,
        gatewayPaymentId: paymentStatus === 'paid' ? `pay_DEMOSRV${Date.now()}${i}` : undefined,
        method: paymentStatus === 'paid' ? pick(['upi', 'card', 'netbanking']) : undefined,
      });

      const orderNumber = await CustomerOrder.generateOrderNumber('SRV');
      const createdAt = daysAgo(randomInt(1, 20));
      const statusHistory = buildStatusHistory(SERVICE_HAPPY_PATH, targetStatus, createdAt, customer._id);
      const assignedVendor = ['assigned', 'in-progress', 'completed'].includes(targetStatus) && vendors.length > 0 ? pick(vendors)._id : null;

      const order = await ServiceOrder.create({
        orderNumber,
        user: customer._id,
        paymentStatus,
        paymentId: payment._id,
        totalAmount,
        addressSnapshot: buildAddressSnapshot(address, customer),
        items,
        scheduledDate: hoursAfter(createdAt, 48),
        scheduledSlot: pick(['9:00 AM - 11:00 AM', '11:00 AM - 1:00 PM', '2:00 PM - 4:00 PM', '4:00 PM - 6:00 PM']),
        assignedVendor,
        status: targetStatus,
        statusHistory,
      });
      await ServiceOrder.updateOne(
        { _id: order._id },
        { $set: { createdAt, updatedAt: statusHistory[statusHistory.length - 1].changedAt } }
      );

      createdServiceOrders.push(order);
      console.log(`  ${order.orderNumber} — ${targetStatus}${assignedVendor ? ' (vendor assigned)' : ''}`);
    }

    // ── ProductOrders, one per status ──────────────────────────────────────────
    console.log('\nCreating ProductOrders (one per status)...');
    const createdProductOrders = [];
    for (const [i, targetStatus] of PRODUCT_STATUSES.entries()) {
      const orderProducts = [pick(products)];
      if (Math.random() < 0.4) orderProducts.push(pick(products));

      const items = orderProducts.map((p) => ({
        productId: p._id,
        productNameSnapshot: p.name,
        priceSnapshot: p.price,
        quantity: randomInt(1, 2),
      }));

      const totalAmount = items.reduce((sum, it) => sum + it.priceSnapshot * it.quantity, 0);
      const paymentStatus = targetStatus === 'pending' ? 'pending' : targetStatus === 'cancelled' ? 'failed' : 'paid';

      const payment = await Payment.create({
        purposeType: 'CustomerOrder',
        amount: totalAmount,
        status: paymentStatus === 'pending' ? 'created' : paymentStatus,
        gateway: 'razorpay',
        gatewayOrderId: `order_DEMOPRD${Date.now()}${i}`,
        gatewayPaymentId: paymentStatus === 'paid' ? `pay_DEMOPRD${Date.now()}${i}` : undefined,
        method: paymentStatus === 'paid' ? pick(['upi', 'card', 'netbanking']) : undefined,
      });

      const orderNumber = await CustomerOrder.generateOrderNumber('PRD');
      const createdAt = daysAgo(randomInt(1, 25));
      const statusHistory = buildStatusHistory(PRODUCT_HAPPY_PATH, targetStatus, createdAt, customer._id);
      const shipped = Boolean(SHIPPING_STATUS_FOR[targetStatus]);

      const order = await ProductOrder.create({
        orderNumber,
        user: customer._id,
        paymentStatus,
        paymentId: payment._id,
        totalAmount,
        addressSnapshot: buildAddressSnapshot(address, customer),
        items,
        shippingProvider: 'shiprocket',
        trackingId: shipped ? `STUB-${orderNumber}` : null,
        awbNumber: shipped ? `AWB${randomInt(100000000, 999999999)}` : null,
        courierName: shipped ? pick(['Delhivery', 'Bluedart', 'Ecom Express']) : null,
        shippingStatus: shipped ? SHIPPING_STATUS_FOR[targetStatus] : 'pending',
        status: targetStatus,
        statusHistory,
      });
      await ProductOrder.updateOne(
        { _id: order._id },
        { $set: { createdAt, updatedAt: statusHistory[statusHistory.length - 1].changedAt } }
      );

      createdProductOrders.push(order);
      console.log(`  ${order.orderNumber} — ${targetStatus}`);
    }

    console.log('\nSeed complete. Expected counts (created by this run):');
    console.table({
      cartItems: cart.items.length,
      serviceOrders: createdServiceOrders.length,
      productOrders: createdProductOrders.length,
      payments: createdServiceOrders.length + createdProductOrders.length,
    });

    console.log('\nVerifying against actual database counts for this customer...');
    const [cartCount, serviceOrderCount, productOrderCount] = await Promise.all([
      Cart.countDocuments({ user: customer._id }),
      ServiceOrder.countDocuments({ user: customer._id }),
      ProductOrder.countDocuments({ user: customer._id }),
    ]);
    console.table({ carts: cartCount, serviceOrders: serviceOrderCount, productOrders: productOrderCount });

    if (serviceOrderCount !== SERVICE_STATUSES.length || productOrderCount !== PRODUCT_STATUSES.length || cartCount !== 1) {
      console.error('\nMISMATCH detected against expected counts — investigate before trusting this data.');
      process.exitCode = 1;
    } else {
      console.log('\nAll actual database counts match expected counts. Seed verified.');
    }

    console.log(`\nCustomer to log in / test with: ${customer.email} (_id ${customer._id})`);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
};

main().catch((err) => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});
