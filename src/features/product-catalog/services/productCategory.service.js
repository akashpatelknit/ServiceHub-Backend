import { ProductCategory } from '../models/productCategory.model.js';
import { Product } from '../../../models/product.model.js';
import { ApiError } from '../../../utils/index.js';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const ProductCategoryService = {
  async create(data, adminId) {
    return ProductCategory.create({ ...data, createdBy: adminId });
  },

  async update(categoryId, data, adminId) {
    const category = await ProductCategory.findById(categoryId);
    if (!category) throw new ApiError(404, 'Product category not found');

    Object.assign(category, data, { updatedBy: adminId });
    await category.save();
    return category;
  },

  async delete(categoryId) {
    const category = await ProductCategory.findById(categoryId);
    if (!category) throw new ApiError(404, 'Product category not found');

    const hasProducts = await Product.exists({ category: categoryId, isDeleted: { $ne: true } });
    if (hasProducts) {
      throw new ApiError(409, 'Cannot delete a product category that still has products assigned to it');
    }

    await category.deleteOne();
    return category;
  },

  async getById(categoryId) {
    const category = await ProductCategory.findById(categoryId);
    if (!category) throw new ApiError(404, 'Product category not found');
    return category;
  },

  async list({ page, limit, isActive, search }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.name = { $regex: escapeRegExp(search), $options: 'i' };

    const [items, total] = await Promise.all([
      ProductCategory.find(filter)
        .sort({ sortOrder: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ProductCategory.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  },
};
