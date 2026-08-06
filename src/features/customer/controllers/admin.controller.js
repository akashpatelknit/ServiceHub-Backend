import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { adminUserService } from '../services/adminUser.service.js';

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, isActive, isBlocked, search } = req.query;
  const result = await adminUserService.list({ page, limit, isActive, isBlocked, search });
  return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Success'));
});

export const getUser = asyncHandler(async (req, res) => {
  const result = await adminUserService.getById(req.params.id);
  return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Success'));
});

export const toggleBlock = asyncHandler(async (req, res) => {
  const user = await adminUserService.setBlocked(req.params.id, req.body.isBlocked);
  return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, user, 'User block status updated'));
});

export const toggleActive = asyncHandler(async (req, res) => {
  const user = await adminUserService.setActive(req.params.id, req.body.isActive);
  return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, user, 'User active status updated'));
});
