import mongoose, { Schema } from 'mongoose';
import { VENDOR_SERVICE_STATUS } from '../constants/catalog.constants.js';
import { MODEL_NAMES } from '../constants/modelNames.constants.js';

// Join/request entity: a Vendor asking to offer a catalog Service. A vendor can only
// browse the catalog and request to offer a Service — they never set price or go live
// without this record being approved by an Admin. `Vendor` is the core identity model
// (core/models/vendor.model.js); this feature only references it by name.
const vendorServiceSchema = new Schema(
  {
    vendor: {
      type: mongoose.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    service: {
      type: mongoose.Types.ObjectId,
      ref: MODEL_NAMES.SERVICE,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(VENDOR_SERVICE_STATUS),
      default: VENDOR_SERVICE_STATUS.PENDING,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      type: mongoose.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
      default: null,
    },
  },
  { timestamps: true }
);

// A vendor may only have one active request/offer per service.
vendorServiceSchema.index({ vendor: 1, service: 1 }, { unique: true });
vendorServiceSchema.index({ status: 1 });

export const VendorService = mongoose.model(MODEL_NAMES.VENDOR_SERVICE, vendorServiceSchema);
