import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { profileService } from '../services/profile.service.js';

export const getMe = asyncHandler(async (req, res) => {
  const user = await profileService.getProfile(req.user._id);
  return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, user, 'Success'));
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await profileService.updateProfile(req.user._id, req.body);
  return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, user, 'Profile updated'));
});

export const changeMyPassword = asyncHandler(async (req, res) => {
  await profileService.changePassword(req.user, req.body);
  return res
    .status(StatusCodes.OK)
    .clearCookie('accessToken')
    .clearCookie('refreshToken')
    .json(new ApiResponse(StatusCodes.OK, null, 'Password changed. Please login again.'));
});
