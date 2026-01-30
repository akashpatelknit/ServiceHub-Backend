import { asyncHandler } from "../../utils/index.js";

export const registerVendor = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true });
});

export const loginVendor = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true });
});

export const getVendorProfile = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true });
});

export const refreshVendorToken = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true });
});

export const logoutVendor = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true });
});