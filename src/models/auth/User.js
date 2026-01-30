import mongoose from 'mongoose';
import { toSnakeCaseTransform } from '../utils/toSnakeCase.js';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, lowercase: true, index: true },
    phone: { type: String },
    passwordHash: { type: String, required: true },

    userType: {
      type: String,
      enum: ['CUSTOMER', 'VENDOR', 'ADMIN'],
      required: true,
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING', 'BLOCKED'],
      default: 'PENDING',
    },

    isEmailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
