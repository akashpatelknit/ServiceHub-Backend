// One-off CLI script to seed a handful of dummy Notification documents for local
// UI testing (the admin dashboard's REST-backed notification bell/drawer).
//
// Usage:
//   node scripts/seedNotifications.js [--adminId=<id>]
//
// --adminId defaults to the first Admin found in the DB.

import mongoose from 'mongoose';
import config from '../src/config/config.js';
import { DB_NAME } from '../src/constants/constants.js';
import { Admin } from '../src/core/models/index.js';
import { Notification } from '../src/models/notification.model.js';

const parseArgs = () => {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
};

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const main = async () => {
  const args = parseArgs();

  await mongoose.connect(config.DATABASE_URL, { dbName: DB_NAME });

  try {
    const adminId = args.adminId || (await Admin.findOne())?._id;
    if (!adminId) {
      console.error('No Admin found in the DB and no --adminId provided. Aborting.');
      process.exit(1);
    }

    const dummyNotifications = [
      {
        title: 'New Booking Received',
        description: 'Akash Patel booked House Cleaning — ₹1,198.',
        type: 'admin',
        category: 'booking',
        isRead: false,
        admin: adminId,
      },
      {
        title: 'Payment Received',
        description: '₹1,198 paid (CustomerOrder).',
        type: 'admin',
        category: 'booking_payment_received',
        isRead: false,
        admin: adminId,
      },
      {
        title: 'KYC Verification',
        description: 'Priya Sharma submitted KYC documents for review.',
        type: 'admin',
        category: 'general',
        isRead: false,
        admin: adminId,
      },
      {
        title: 'Payment Failed',
        description: '₹499 payment failed (CustomerOrder).',
        type: 'admin',
        category: 'payment',
        isRead: true,
        admin: adminId,
      },
      {
        title: 'New Wallet Top-up',
        description: 'Rahul Verma (User) initiated wallet top-up of ₹500.',
        type: 'all',
        category: 'wallet_topup',
        isRead: true,
        admin: adminId,
      },
      {
        title: 'New Membership Purchase',
        description: 'Sneha Reddy (Vendor) purchased Gold membership plan.',
        type: 'all',
        category: 'membership_purchase',
        isRead: true,
        admin: adminId,
      },
    ];

    const created = await Notification.insertMany(dummyNotifications);

    // Backdate a couple so the drawer's date-grouping ("Today" / "Yesterday" /
    // older) has something to actually group.
    await Notification.updateOne({ _id: created[3]._id }, { $set: { createdAt: daysAgo(1) } });
    await Notification.updateOne({ _id: created[4]._id }, { $set: { createdAt: daysAgo(1) } });
    await Notification.updateOne({ _id: created[5]._id }, { $set: { createdAt: daysAgo(5) } });

    console.log(`Seeded ${created.length} dummy notifications for admin ${adminId}.`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((err) => {
  console.error('Failed to seed notifications:', err);
  process.exit(1);
});
