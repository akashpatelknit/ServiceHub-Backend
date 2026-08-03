import mongoose, { Schema } from 'mongoose';
import slugify from 'slugify';
import { ApiError } from '../../../utils/index.js';
import { Subcategory } from './subcategory.model.js';
import { imageSchema } from './image.schema.js';
import { MODEL_NAMES } from '../constants/modelNames.constants.js';

// Level 3 of the catalog hierarchy: Category -> Subcategory -> ServiceGroup -> Service.
// e.g. "Super saver packages" under "AC" under "AC & Appliance Repair".
const serviceGroupSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Service group name is required'],
      trim: true,
      maxlength: [100, 'Service group name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    image: {
      type: imageSchema,
      default: null,
    },
    subcategory: {
      type: mongoose.Types.ObjectId,
      ref: MODEL_NAMES.SUBCATEGORY,
      required: true,
    },
    // Denormalized from subcategory.category so services can be filtered by
    // category without walking/populating the hierarchy chain.
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

serviceGroupSchema.index({ subcategory: 1, slug: 1 }, { unique: true });
serviceGroupSchema.index({ category: 1, subcategory: 1, isActive: 1 });

// Must run pre('validate'), not pre('save') — `category` is a required path, and
// Mongoose runs its built-in required-field validation during the validate phase,
// before any pre('save') hook gets a chance to populate it.
serviceGroupSchema.pre('validate', async function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }

  if (this.isModified('subcategory') || this.isNew) {
    const subcategory = await Subcategory.findById(this.subcategory);
    if (!subcategory) {
      return next(new ApiError(404, 'Subcategory not found'));
    }
    this.category = subcategory.category;
  }

  next();
});

export const ServiceGroup = mongoose.model(MODEL_NAMES.SERVICE_GROUP, serviceGroupSchema);
