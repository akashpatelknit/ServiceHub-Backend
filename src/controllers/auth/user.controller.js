import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../utils/index.js";

export const registerUser = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json({ success: true });
});

export const loginUser = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json({ success: true });
});

export const verifyEmailOTP = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json({ success: true });
});

export const getUserProfile = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json({ success: true });
});

export const refreshUserToken = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json({ success: true });
});

export const logoutUser = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json({ success: true });
}); 