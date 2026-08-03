import mongoose from 'mongoose';
import { withAuth } from '../../plugins/withAuth.js';
import { ADMIN_SUB_ROLES } from '../../features/auth/constants/permissions.constants.js';

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Invalid email format',
      },
    },

    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },

    password: { type: String },

    // Fixed enum — permissions are resolved from ADMIN_SUB_ROLE_PERMISSIONS at request time,
    // not stored per-document. See features/auth/constants/permissions.constants.js.
    subRole: {
      type: String,
      enum: Object.values(ADMIN_SUB_ROLES),
      required: true,
      default: ADMIN_SUB_ROLES.SUPPORT,
    },

    isBlocked: { type: Boolean, default: false },
    avatar: { type: String },

    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
  },
  { timestamps: true }
);

withAuth(adminSchema);

adminSchema.virtual('fullName').get(function () {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});

adminSchema.set('toJSON', { virtuals: true });
adminSchema.set('toObject', { virtuals: true });

export const Admin = mongoose.model('Admin', adminSchema);
