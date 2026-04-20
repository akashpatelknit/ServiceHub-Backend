import { asyncHandler } from "../../utils/index.js";

export const registerAdmin = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true });
});

export const loginAdmin = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true });
});

export const refreshAdminToken = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true });
});

export const getAdminProfile = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true });
});

export const logoutAdmin = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true });
});