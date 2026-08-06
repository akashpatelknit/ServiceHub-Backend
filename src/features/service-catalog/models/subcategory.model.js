import mongoose, { Schema } from 'mongoose';
import slugify from 'slugify';
import { imageSchema } from './image.schema.js';
import { MODEL_NAMES } from '../constants/modelNames.constants.js';
import { DISPLAY_TYPES } from '../constants/catalog.constants.js';

// Level 2 of the catalog hierarchy: Category -> Subcategory -> ServiceGroup -> Service.
const subcategorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Subcategory name is required'],
      trim: true,
      maxlength: [100, 'Subcategory name cannot exceed 100 characters'],
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
    category: {
      type: mongoose.Types.ObjectId,
      ref: MODEL_NAMES.CATEGORY,
      required: true,
    },
    // Drives client click behavior: 'modal' opens a picker sheet of this subcategory's
    // service groups; 'navigate' routes straight to the subcategory detail page.
    displayType: {
      type: String,
      enum: Object.values(DISPLAY_TYPES),
      default: DISPLAY_TYPES.NAVIGATE,
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

// A subcategory name only needs to be unique within its parent category.
subcategorySchema.index({ category: 1, slug: 1 }, { unique: true });
subcategorySchema.index({ category: 1, isActive: 1, sortOrder: 1 });
subcategorySchema.index({ name: 'text' });

subcategorySchema.pre('save', function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export const Subcategory = mongoose.model(MODEL_NAMES.SUBCATEGORY, subcategorySchema);
