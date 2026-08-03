import mongoose, { Schema } from 'mongoose';
import { ApiError } from '../../../utils/index.js';
import { imageSchema } from './image.schema.js';
import { MODEL_NAMES } from '../constants/modelNames.constants.js';

// Extra item a customer can attach to a booking. Linked to exactly one of Service or
// ServiceGroup so add-ons stay contextually relevant (AC add-ons don't show under a
// salon service). No vendor request/approval — add-ons inherit availability from the
// vendor's approved VendorService for the linked Service.
const addOnSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Add-on name is required'],
      trim: true,
      maxlength: [100, 'Add-on name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    image: {
      type: imageSchema,
      default: null,
    },
    service: {
      type: mongoose.Types.ObjectId,
      ref: MODEL_NAMES.SERVICE,
      default: null,
    },
    serviceGroup: {
      type: mongoose.Types.ObjectId,
      ref: MODEL_NAMES.SERVICE_GROUP,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    updatedBy: {
      type: mongoose.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

addOnSchema.index({ service: 1, isActive: 1 });
addOnSchema.index({ serviceGroup: 1, isActive: 1 });

addOnSchema.pre('validate', function (next) {
  const hasService = Boolean(this.service);
  const hasServiceGroup = Boolean(this.serviceGroup);

  if (hasService === hasServiceGroup) {
    return next(new ApiError(400, 'Add-on must be linked to exactly one of service or serviceGroup'));
  }

  next();
});

export const AddOn = mongoose.model(MODEL_NAMES.ADD_ON, addOnSchema);
