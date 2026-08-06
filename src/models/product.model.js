import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  altText: { type: String },
  isMainImage: {
    type: Boolean,
    default: false,
  },
});

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    shortDescription: { type: String },
    price: { type: Number, required: true },
    discountPrice: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    // Dedicated product-category system (features/product-catalog/models/productCategory.model.js)
    // — deliberately not the legacy 'Category' model, which is service-oriented.
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory' },
    inventoryCount: { type: Number },
    stock: { type: Number, required: true },
    sku: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['inStock', 'outOfStock', 'discontinued'],
      default: 'inStock',
    },
    publishStatus: {
      type: String,
      enum: ['published', 'draft', 'archived'],
      default: 'draft',
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'private',
    },
    manufacturer: {
      name: { type: String },
      brand: { type: String },
      generalDescription: { type: String },
      generalShortDescription: { type: String },
    },
    productImages: {
      type: [String],
      default: [],
    },
    images: [ImageSchema],
    keywords: [{ type: String }],
    totalRatings: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
    ratings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Rating' }],
  },
  {
    timestamps: true,
  }
);

ProductSchema.virtual('imageUrl').get(function () {
  const mainImage =
    this.productImages[0] ||
    'https://upload-image-20606.s3.ap-south-1.amazonaws.com/products/large/fallback2_1758352860499_405122c3a44e_large.png';
  return mainImage;
});

ProductSchema.pre('save', function (next) {
  calculateDiscount(this);
  next();
});

function calculateDiscount(doc) {
  if (!doc.price) return;

  if (doc.discountPrice && doc.discountPrice < doc.price) {
    doc.discountPercentage = Math.round(((doc.price - doc.discountPrice) / doc.price) * 100);
  } else if (doc.discountPercentage && doc.discountPercentage > 0) {
    doc.discountPrice = Math.round(doc.price - (doc.price * doc.discountPercentage) / 100);
  } else {
    doc.discountPrice = undefined;
    doc.discountPercentage = undefined;
  }
}

ProductSchema.pre('findByIdAndUpdate', function (next) {
  let update = this.getUpdate();

  if (update.price || update.discountPrice || update.discountPercentage) {
    let tempDoc = {
      price: update.price,
      discountPrice: update.discountPrice,
      discountPercentage: update.discountPercentage,
    };

    calculateDiscount(tempDoc);

    this.setUpdate({
      ...update,
      discountPrice: tempDoc.discountPrice,
      discountPercentage: tempDoc.discountPercentage,
    });
  }

  next();
});

ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

export const Product = mongoose.model('Product', ProductSchema);
