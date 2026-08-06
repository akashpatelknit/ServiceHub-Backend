import mongoose, { Schema } from 'mongoose';
import slugify from 'slugify';
import { imageSchema } from '../../service-catalog/models/image.schema.js';
import { MODEL_NAMES } from '../constants/modelNames.constants.js';

// Dedicated category system for products — deliberately separate from both the
// legacy Category model and the service-catalog's CatalogCategory (services and
// products are organized independently, not sharing a hierarchy).
const productCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Product category name is required'],
      trim: true,
      maxlength: [100, 'Product category name cannot exceed 100 characters'],
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

productCategorySchema.index({ isActive: 1, sortOrder: 1 });

productCategorySchema.pre('save', function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export const ProductCategory = mongoose.model(MODEL_NAMES.PRODUCT_CATEGORY, productCategorySchema);
