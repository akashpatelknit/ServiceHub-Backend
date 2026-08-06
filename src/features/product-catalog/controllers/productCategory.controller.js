import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { ProductCategoryService } from '../services/productCategory.service.js';

export const ProductCategoryController = {
  create: asyncHandler(async (req, res) => {
    const category = await ProductCategoryService.create(req.body, req.user._id);
    return res.status(StatusCodes.CREATED).json(new ApiResponse(StatusCodes.CREATED, category, 'Product category created'));
  }),

  update: asyncHandler(async (req, res) => {
    const category = await ProductCategoryService.update(req.params.categoryId, req.body, req.user._id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, category, 'Product category updated'));
  }),

  remove: asyncHandler(async (req, res) => {
    await ProductCategoryService.delete(req.params.categoryId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, null, 'Product category deleted'));
  }),

  getById: asyncHandler(async (req, res) => {
    const category = await ProductCategoryService.getById(req.params.categoryId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, category, 'Product category retrieved'));
  }),

  list: asyncHandler(async (req, res) => {
    const result = await ProductCategoryService.list(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Product categories retrieved'));
  }),
};
