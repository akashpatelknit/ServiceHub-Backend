import mongoose, { Schema } from 'mongoose';
import { VENDOR_SERVICE_STATUS, VENDOR_SERVICE_TARGET_TYPE } from '../constants/catalog.constants.js';
import { MODEL_NAMES } from '../constants/modelNames.constants.js';

const TARGET_MODEL_BY_TYPE = {
  [VENDOR_SERVICE_TARGET_TYPE.CATEGORY]: MODEL_NAMES.CATEGORY,
  [VENDOR_SERVICE_TARGET_TYPE.SUBCATEGORY]: MODEL_NAMES.SUBCATEGORY,
};

// Join/request entity: a Vendor asking for approval to offer everything under a
// catalog Category or Subcategory — deliberately broader than a single leaf Service,
// so a vendor requests "AC" or "AC Repair" once rather than every individual AC
// service. They never set price or go live without this record being approved by an
// Admin. `Vendor` is the core identity model (core/models/vendor.model.js); this
// feature only references it by name.
const vendorServiceSchema = new Schema(
  {
    vendor: {
      type: mongoose.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    targetType: {
      type: String,
      enum: Object.values(VENDOR_SERVICE_TARGET_TYPE),
      required: true,
    },
    // Mirrors targetType into the actual Mongoose model name so `target` can be
    // populated polymorphically via refPath — kept in sync by the pre-validate hook
    // below rather than accepted directly from callers.
    targetModel: {
      type: String,
      enum: Object.values(TARGET_MODEL_BY_TYPE),
      required: true,
    },
    target: {
      type: mongoose.Types.ObjectId,
      refPath: 'targetModel',
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

vendorServiceSchema.pre('validate', function (next) {
  this.targetModel = TARGET_MODEL_BY_TYPE[this.targetType];
  next();
});

// A vendor may only have one active request/approval per category or subcategory.
vendorServiceSchema.index({ vendor: 1, targetType: 1, target: 1 }, { unique: true });
vendorServiceSchema.index({ status: 1 });

export const VendorService = mongoose.model(MODEL_NAMES.VENDOR_SERVICE, vendorServiceSchema);
