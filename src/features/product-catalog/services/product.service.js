import { Product } from '../../../models/product.model.js';
import { ApiError } from '../../../utils/index.js';

// $regex is built from admin-supplied free text — escape regex metacharacters so an
// unbalanced paren/bracket can't 500 the endpoint (and isn't a ReDoS surface). Same
// fix as cart/services/adminOrder.service.js.
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const ProductCatalogService = {
  async create(data) {
    const existingSku = await Product.findOne({ sku: data.sku });
    if (existingSku) throw new ApiError(409, `A product with SKU "${data.sku}" already exists`);
    return Product.create(data);
  },

  async update(productId, data) {
    const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } });
    if (!product) throw new ApiError(404, 'Product not found');

    if (data.sku && data.sku !== product.sku) {
      const existingSku = await Product.findOne({ sku: data.sku, _id: { $ne: productId } });
      if (existingSku) throw new ApiError(409, `A product with SKU "${data.sku}" already exists`);
    }

    Object.assign(product, data);
    await product.save();
    return product;
  },

  // Soft delete, not a hasDependents-guarded hard delete like Category/Service —
  // Product is referenced by historical ProductOrder items (snapshot-protected either
  // way, see features/product-order) and live Cart items (already surfaced as
  // `unavailable` if missing/inactive, see features/cart), so there's nothing that
  // needs blocking; just hide it going forward.
  async delete(productId) {
    const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } });
    if (!product) throw new ApiError(404, 'Product not found');
    product.isDeleted = true;
    product.isActive = false;
    await product.save();
    return product;
  },

  async getById(productId) {
    const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } }).populate('category', 'name');
    if (!product) throw new ApiError(404, 'Product not found');
    return product;
  },

  async list({ page, limit, category, isActive, status, search }) {
    const filter = { isDeleted: { $ne: true } };
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (status) filter.status = status;
    if (search) {
      const safeSearch = escapeRegExp(search);
      filter.$or = [{ name: { $regex: safeSearch, $options: 'i' } }, { sku: { $regex: safeSearch, $options: 'i' } }];
    }

    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  },
};
