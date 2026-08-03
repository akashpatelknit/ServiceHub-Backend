import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { ServiceGroupService } from '../services/serviceGroup.service.js';

export const ServiceGroupController = {
  create: asyncHandler(async (req, res) => {
    const serviceGroup = await ServiceGroupService.create(req.body, req.user._id);
    return res
      .status(StatusCodes.CREATED)
      .json(new ApiResponse(StatusCodes.CREATED, serviceGroup, 'Service group created'));
  }),

  update: asyncHandler(async (req, res) => {
    const serviceGroup = await ServiceGroupService.update(req.params.serviceGroupId, req.body, req.user._id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, serviceGroup, 'Service group updated'));
  }),

  remove: asyncHandler(async (req, res) => {
    await ServiceGroupService.delete(req.params.serviceGroupId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, null, 'Service group deleted'));
  }),

  getById: asyncHandler(async (req, res) => {
    const serviceGroup = await ServiceGroupService.getById(req.params.serviceGroupId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, serviceGroup, 'Service group retrieved'));
  }),

  list: asyncHandler(async (req, res) => {
    const result = await ServiceGroupService.list(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Service groups retrieved'));
  }),
};
