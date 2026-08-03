import { Category } from '../models/category.model.js';
import { Subcategory } from '../models/subcategory.model.js';
import { ApiError } from '../../../utils/index.js';

export const CategoryService = {
  async create(data, adminId) {
    return Category.create({ ...data, createdBy: adminId });
  },

  async update(categoryId, data, adminId) {
    const category = await Category.findById(categoryId);
    if (!category) throw new ApiError(404, 'Category not found');

    Object.assign(category, data, { updatedBy: adminId });
    await category.save();
    return category;
  },

  async delete(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) throw new ApiError(404, 'Category not found');

    const hasSubcategories = await Subcategory.exists({ category: categoryId });
    if (hasSubcategories) {
      throw new ApiError(409, 'Cannot delete a category that still has subcategories');
    }

    await category.deleteOne();
    return category;
  },

  async getById(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) throw new ApiError(404, 'Category not found');
    return category;
  },

  // `hasChildren` (at least one active Subcategory) is computed in a single aggregation
  // via $lookup + $limit:1 rather than one Subcategory.exists() per item, to avoid an
  // N+1 query per page of results.
  async list({ page, limit, isActive }) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const [result] = await Category.aggregate([
      { $match: filter },
      { $sort: { sortOrder: 1, name: 1 } },
      {
        $facet: {
          items: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $lookup: {
                from: Subcategory.collection.name,
                let: { categoryId: '$_id' },
                pipeline: [
                  { $match: { $expr: { $and: [{ $eq: ['$category', '$$categoryId'] }, { $eq: ['$isActive', true] }] } } },
                  { $limit: 1 },
                  { $project: { _id: 1 } },
                ],
                as: 'activeChildren',
              },
            },
            { $addFields: { hasChildren: { $gt: [{ $size: '$activeChildren' }, 0] } } },
            { $project: { activeChildren: 0 } },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    return { items: result.items, total: result.totalCount[0]?.count ?? 0, page, limit };
  },
};
