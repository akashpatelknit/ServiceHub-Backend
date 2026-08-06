import mongoose from 'mongoose';
import { withAuth, withReferral, withSoftDelete } from '../../plugins/index.js';
import { imageSchema } from '../../features/service-catalog/models/image.schema.js';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, maxlength: [50, 'First name cannot exceed 50 characters'] },
    lastName: { type: String, trim: true, maxlength: [50, 'Last name cannot exceed 50 characters'] },
    middleName: { type: String, trim: true, maxlength: [50, 'Middle name cannot exceed 50 characters'] },

    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      validate: {
        validator: (v) => !v || /^\+?[1-9]\d{1,14}$/.test(v),
        message: 'Invalid phone number format',
      },
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Invalid email format',
      },
    },

    dob: { type: Date },
    avatar: imageSchema,
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
    // Soft-deactivate — separate concern from isBlocked (self-service vs admin action).
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },

    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },

    // Addresses live in the shared Address collection, queried via
    // Address.find({ owner: user._id, ownerType: 'User' }) — not embedded here.
    defaultAddress: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },

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

// email and phoneNumber already get unique indexes from `unique: true` above.

export const User = mongoose.model('User', userSchema);
