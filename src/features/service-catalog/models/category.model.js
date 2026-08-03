import mongoose, { Schema } from 'mongoose';
import slugify from 'slugify';
import { imageSchema } from './image.schema.js';
import { MODEL_NAMES } from '../constants/modelNames.constants.js';
import { DISPLAY_TYPES } from '../constants/catalog.constants.js';

// Level 1 of the catalog hierarchy: Category -> Subcategory -> ServiceGroup -> Service.
const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
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
    // Drives client click behavior: 'modal' opens a picker sheet of this category's
    // subcategories (see GET /subcategories?category=<id>); 'navigate' routes straight
    // to the category detail page. See DISPLAY_TYPES for the fallback-to-navigate rule
    // when a 'modal' category turns out to have no active children.
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

categorySchema.index({ isActive: 1, sortOrder: 1 });

categorySchema.pre('save', function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export const Category = mongoose.model(MODEL_NAMES.CATEGORY, categorySchema);
