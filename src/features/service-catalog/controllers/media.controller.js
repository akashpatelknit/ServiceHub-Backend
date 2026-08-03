import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { MediaService } from '../services/media.service.js';

export const MediaController = {
  getPresignedUploadUrl: asyncHandler(async (req, res) => {
    const result = await MediaService.generatePresignedUploadUrl(req.body);
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, result, 'Presigned upload URL generated'));
  }),
};
