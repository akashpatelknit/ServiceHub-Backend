import { StatusCodes } from 'http-status-codes';
import { ApiResponse, ApiError, asyncHandler } from '../../../utils/index.js';
import { Admin } from '../../../core/models/index.js';
import { KycService } from '../services/kyc.service.js';

export const AdminController = {
  assignSubRole: asyncHandler(async (req, res) => {
    const { adminId } = req.params;
    const admin = await Admin.findByIdAndUpdate(adminId, { subRole: req.body.subRole }, { new: true, runValidators: true });

    if (!admin) {
      throw new ApiError(404, 'Admin not found');
    }

    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, admin, 'Admin sub-role updated'));
  }),

  listKyc: asyncHandler(async (req, res) => {
    const result = await KycService.adminList(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'KYC list retrieved'));
  }),

  getKyc: asyncHandler(async (req, res) => {
    const kyc = await KycService.adminGetByVendor(req.params.vendorId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, kyc, 'KYC retrieved'));
  }),

  approveKyc: asyncHandler(async (req, res) => {
    const kyc = await KycService.approve(req.params.vendorId, req.user._id, req.body.comments);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, kyc, 'KYC approved'));
  }),

  rejectKyc: asyncHandler(async (req, res) => {
    const kyc = await KycService.reject(req.params.vendorId, req.user._id, req.body.reason, req.body.comments);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, kyc, 'KYC rejected'));
  }),
};
