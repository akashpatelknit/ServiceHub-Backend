import mongoose from 'mongoose';
import { toSnakeCaseTransform } from '../utils/toSnakeCase.js';

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    type: {
      type: String,
      enum: ['CUSTOMER', 'VENDOR', 'ADMIN'],
      required: true,
    },

    name: { type: String },
    companyName: { type: String },
    gstNumber: { type: String },

    address: { type: String },

    approvedByAdmin: { type: Boolean, default: false },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

export const Profile = mongoose.model('Profile', profileSchema);
