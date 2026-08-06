import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { ProductCatalogService } from '../services/product.service.js';

export const ProductController = {
  create: asyncHandler(async (req, res) => {
    const product = await ProductCatalogService.create(req.body);
    return res.status(StatusCodes.CREATED).json(new ApiResponse(StatusCodes.CREATED, product, 'Product created'));
  }),

  update: asyncHandler(async (req, res) => {
    const product = await ProductCatalogService.update(req.params.productId, req.body);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, product, 'Product updated'));
  }),

  remove: asyncHandler(async (req, res) => {
    await ProductCatalogService.delete(req.params.productId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, null, 'Product deleted'));
  }),

  getById: asyncHandler(async (req, res) => {
    const product = await ProductCatalogService.getById(req.params.productId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, product, 'Product retrieved'));
  }),

  list: asyncHandler(async (req, res) => {
    const result = await ProductCatalogService.list(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Products retrieved'));
  }),
};
