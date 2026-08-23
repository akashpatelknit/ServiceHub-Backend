import mongoose from 'mongoose';
import { withAuth, withSoftDelete, withReferral } from '../../plugins/index.js';

const vendorSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    middleName: {
      type: String,
      trim: true,
      maxlength: [50, 'Middle name cannot exceed 50 characters'],
    },

    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      validate: {
        validator: (v) => /^\+?[1-9]\d{1,14}$/.test(v),
        message: 'Invalid phone number format',
      },
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Invalid email format',
      },
    },

    dob: { type: Date },
    purpose: { type: String, trim: true, maxlength: [500, 'Purpose cannot exceed 500 characters'] },
    avatar: { type: String, trim: true },
    password: { type: String },

    // See core/models/user.model.js for why this stays despite being a constant per collection.
    role: { type: String, default: 'vendor', immutable: true },

    isVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    blockReason: { type: String },

    // Admin-facing account status. isBlocked/isVerified stay in sync with this
    // (see features/vendor-management/services/adminVendor.service.js) so the
    // existing login gate (isBlocked) and vendor-candidate matching gate
    // (isVerified) both keep working without needing to read this field directly.
    status: { type: String, enum: ['pending', 'active', 'blocked', 'suspended'], default: 'pending' },

    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },

    // KYC status/documents live entirely in features/auth's Kyc state machine now —
    // no mirrored fields here, single source of truth.

    serviceRadius: { type: Number, default: 5, min: [1, 'Min 1km'], max: [100, 'Max 100km'] },
    isAvailable: { type: Boolean, default: true },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },

    addresses: [
      {
        address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],

    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
    membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership' },
  },
  { timestamps: true }
);

withAuth(vendorSchema);
withSoftDelete(vendorSchema);
withReferral(vendorSchema, 'Vendor');

vendorSchema.virtual('fullName').get(function () {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});

vendorSchema.virtual('servicemappings', {
  ref: 'VendorServiceMapping',
  localField: '_id',
  foreignField: 'vendorId',
});

vendorSchema.set('toJSON', { virtuals: true });
vendorSchema.set('toObject', { virtuals: true });

vendorSchema.index({ email: 1, phoneNumber: 1 });
vendorSchema.index({ currentLocation: '2dsphere' });

export const Vendor = mongoose.model('Vendor', vendorSchema);
