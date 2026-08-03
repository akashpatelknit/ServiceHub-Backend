import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { CategoryService } from '../services/category.service.js';

export const CategoryController = {
  create: asyncHandler(async (req, res) => {
    const category = await CategoryService.create(req.body, req.user._id);
    return res.status(StatusCodes.CREATED).json(new ApiResponse(StatusCodes.CREATED, category, 'Category created'));
  }),

  update: asyncHandler(async (req, res) => {
    const category = await CategoryService.update(req.params.categoryId, req.body, req.user._id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, category, 'Category updated'));
  }),

  remove: asyncHandler(async (req, res) => {
    await CategoryService.delete(req.params.categoryId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, null, 'Category deleted'));
  }),

  getById: asyncHandler(async (req, res) => {
    const category = await CategoryService.getById(req.params.categoryId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, category, 'Category retrieved'));
  }),

  list: asyncHandler(async (req, res) => {
    const result = await CategoryService.list(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Categories retrieved'));
  }),
};
