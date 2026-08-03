import mongoose, { Schema } from 'mongoose';
import slugify from 'slugify';
import { ApiError } from '../../../utils/index.js';
import { ServiceGroup } from './serviceGroup.model.js';
import { imageSchema } from './image.schema.js';
import { MODEL_NAMES } from '../constants/modelNames.constants.js';

// Level 4 (leaf) of the catalog hierarchy: Category -> Subcategory -> ServiceGroup -> Service.
// e.g. "Foam-jet service (2 ACs)". Price is fixed and set only by admin.
const serviceSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: [150, 'Service name cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    // Maximum retail price — shown struck through next to `price` to display a
    // discount. Optional: not every service is discounted off a list price.
    mrp: {
      type: Number,
      min: [0, 'MRP cannot be negative'],
    },
    durationMins: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    // Short marketing bullets shown on the service card (e.g. "Includes foam-jet
    // cleaning", "45-day warranty") — distinct from the longer free-text `description`.
    bullets: {
      type: [String],
      default: [],
    },
    // e.g. "₹599 per AC" — shown under the price for services billed per-unit.
    unitPriceLabel: {
      type: String,
      trim: true,
      maxlength: [50, 'Unit price label cannot exceed 50 characters'],
    },
    images: {
      type: [imageSchema],
      default: [],
    },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
    serviceGroup: {
      type: mongoose.Types.ObjectId,
      ref: MODEL_NAMES.SERVICE_GROUP,
      required: true,
    },
    // Denormalized from the parent chain for fast filtering (e.g. "all services under
    // category X") without populating serviceGroup -> subcategory -> category each time.
    subcategory: {
      type: mongoose.Types.ObjectId,
      ref: MODEL_NAMES.SUBCATEGORY,
      required: true,
    },
    category: {
      type: mongoose.Types.ObjectId,
      ref: MODEL_NAMES.CATEGORY,
      required: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
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

serviceSchema.index({ serviceGroup: 1, slug: 1 }, { unique: true });
serviceSchema.index({ category: 1, subcategory: 1, serviceGroup: 1, isActive: 1 });
serviceSchema.index({ name: 'text', description: 'text' });

// Must run pre('validate'), not pre('save') — `subcategory`/`category` are required
// paths, and Mongoose runs its built-in required-field validation during the validate
// phase, before any pre('save') hook gets a chance to populate them.
serviceSchema.pre('validate', async function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }

  if (this.isModified('serviceGroup') || this.isNew) {
    const serviceGroup = await ServiceGroup.findById(this.serviceGroup);
    if (!serviceGroup) {
      return next(new ApiError(404, 'Service group not found'));
    }
    this.subcategory = serviceGroup.subcategory;
    this.category = serviceGroup.category;
  }

  next();
});

export const Service = mongoose.model(MODEL_NAMES.SERVICE, serviceSchema);
