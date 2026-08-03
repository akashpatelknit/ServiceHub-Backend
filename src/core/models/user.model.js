import mongoose from 'mongoose';
import { withAuth, withReferral, withSoftDelete } from '../../plugins/index.js';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, maxlength: [50, 'First name cannot exceed 50 characters'] },
    lastName: { type: String, trim: true, maxlength: [50, 'Last name cannot exceed 50 characters'] },
    middleName: { type: String, trim: true, maxlength: [50, 'Middle name cannot exceed 50 characters'] },

    phoneNumber: {
      type: String,
      unique: true,
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
    avatar: { type: String, trim: true },
    password: { type: String },

    // Kept for the ~18 non-auth files that already key off `user.role` /
    // `vendor.role` (booking, wallet, payment, reports…) — out of scope for this
    // pass per the req. 5 boundary decision. Identity for new auth code comes
    // from which collection the actor lives in, not this field.
    role: { type: String, default: 'user', immutable: true },

    isVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },

    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },

    addresses: [
      {
        address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],

    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
    membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership' },
    coupons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }],
  },
  { timestamps: true }
);

withAuth(userSchema);
withSoftDelete(userSchema);
withReferral(userSchema, 'User');

userSchema.virtual('fullName').get(function () {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

userSchema.index({ email: 1 });
// phoneNumber already gets a unique index from `unique: true` above.

export const User = mongoose.model('User', userSchema);
