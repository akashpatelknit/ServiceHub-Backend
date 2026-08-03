import mongoose from 'mongoose';
import { Category } from '../models/category.model.js';
import { Subcategory } from '../models/subcategory.model.js';
import { ServiceGroup } from '../models/serviceGroup.model.js';
import { ApiError } from '../../../utils/index.js';

export const SubcategoryService = {
  async create(data, adminId) {
    const category = await Category.findById(data.category);
    if (!category) throw new ApiError(404, 'Category not found');

    return Subcategory.create({ ...data, createdBy: adminId });
  },

  async update(subcategoryId, data, adminId) {
    const subcategory = await Subcategory.findById(subcategoryId);
    if (!subcategory) throw new ApiError(404, 'Subcategory not found');

    if (data.category) {
      const category = await Category.findById(data.category);
      if (!category) throw new ApiError(404, 'Category not found');
    }

    Object.assign(subcategory, data, { updatedBy: adminId });
    await subcategory.save();
    return subcategory;
  },

  async delete(subcategoryId) {
    const subcategory = await Subcategory.findById(subcategoryId);
    if (!subcategory) throw new ApiError(404, 'Subcategory not found');

    const hasServiceGroups = await ServiceGroup.exists({ subcategory: subcategoryId });
    if (hasServiceGroups) {
      throw new ApiError(409, 'Cannot delete a subcategory that still has service groups');
    }

    await subcategory.deleteOne();
    return subcategory;
  },

  async getById(subcategoryId) {
    const subcategory = await Subcategory.findById(subcategoryId);
    if (!subcategory) throw new ApiError(404, 'Subcategory not found');
    return subcategory;
  },

  // `hasChildren` (at least one active ServiceGroup) is computed in a single aggregation
  // via $lookup + $limit:1 rather than one ServiceGroup.exists() per item, to avoid an
  // N+1 query per page of results.
  async list({ page, limit, category, isActive }) {
    const filter = {};
    // Model.aggregate() sends $match straight to MongoDB without Mongoose's query-cast
    // layer (unlike Model.find()), so a raw id string here would never match the
    // ObjectId actually stored on `category` — cast it explicitly.
    if (category) filter.category = new mongoose.Types.ObjectId(category);
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const [result] = await Subcategory.aggregate([
      { $match: filter },
      { $sort: { sortOrder: 1, name: 1 } },
      {
        $facet: {
          items: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $lookup: {
                from: ServiceGroup.collection.name,
                let: { subcategoryId: '$_id' },
                pipeline: [
                  { $match: { $expr: { $and: [{ $eq: ['$subcategory', '$$subcategoryId'] }, { $eq: ['$isActive', true] }] } } },
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
