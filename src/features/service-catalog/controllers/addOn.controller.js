import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { AddOnService } from '../services/addOn.service.js';

export const AddOnController = {
  create: asyncHandler(async (req, res) => {
    const addOn = await AddOnService.create(req.body, req.user._id);
    return res.status(StatusCodes.CREATED).json(new ApiResponse(StatusCodes.CREATED, addOn, 'Add-on created'));
  }),

  update: asyncHandler(async (req, res) => {
    const addOn = await AddOnService.update(req.params.addOnId, req.body, req.user._id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, addOn, 'Add-on updated'));
  }),

  remove: asyncHandler(async (req, res) => {
    await AddOnService.delete(req.params.addOnId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, null, 'Add-on deleted'));
  }),

  getById: asyncHandler(async (req, res) => {
    const addOn = await AddOnService.getById(req.params.addOnId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, addOn, 'Add-on retrieved'));
  }),

  list: asyncHandler(async (req, res) => {
    const result = await AddOnService.list(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Add-ons retrieved'));
  }),
};
