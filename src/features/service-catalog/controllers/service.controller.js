import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { ServiceCatalogItemService } from '../services/service.service.js';

export const ServiceController = {
  create: asyncHandler(async (req, res) => {
    const service = await ServiceCatalogItemService.create(req.body, req.user._id);
    return res.status(StatusCodes.CREATED).json(new ApiResponse(StatusCodes.CREATED, service, 'Service created'));
  }),

  update: asyncHandler(async (req, res) => {
    const service = await ServiceCatalogItemService.update(req.params.serviceId, req.body, req.user._id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, service, 'Service updated'));
  }),

  remove: asyncHandler(async (req, res) => {
    await ServiceCatalogItemService.delete(req.params.serviceId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, null, 'Service deleted'));
  }),

  getById: asyncHandler(async (req, res) => {
    const service = await ServiceCatalogItemService.getById(req.params.serviceId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, service, 'Service retrieved'));
  }),

  list: asyncHandler(async (req, res) => {
    const result = await ServiceCatalogItemService.list(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Services retrieved'));
  }),
};
