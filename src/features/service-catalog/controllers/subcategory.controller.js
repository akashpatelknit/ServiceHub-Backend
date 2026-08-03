import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { SubcategoryService } from '../services/subcategory.service.js';

export const SubcategoryController = {
  create: asyncHandler(async (req, res) => {
    const subcategory = await SubcategoryService.create(req.body, req.user._id);
    return res
      .status(StatusCodes.CREATED)
      .json(new ApiResponse(StatusCodes.CREATED, subcategory, 'Subcategory created'));
  }),

  update: asyncHandler(async (req, res) => {
    const subcategory = await SubcategoryService.update(req.params.subcategoryId, req.body, req.user._id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, subcategory, 'Subcategory updated'));
  }),

  remove: asyncHandler(async (req, res) => {
    await SubcategoryService.delete(req.params.subcategoryId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, null, 'Subcategory deleted'));
  }),

  getById: asyncHandler(async (req, res) => {
    const subcategory = await SubcategoryService.getById(req.params.subcategoryId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, subcategory, 'Subcategory retrieved'));
  }),

  list: asyncHandler(async (req, res) => {
    const result = await SubcategoryService.list(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Subcategories retrieved'));
  }),
};
