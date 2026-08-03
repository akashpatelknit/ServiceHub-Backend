import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { KycService } from '../services/kyc.service.js';

const respond = (res, kyc, message) => res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, kyc, message));

export const KycController = {
  getStatus: asyncHandler(async (req, res) => {
    const kyc = await KycService.getByVendor(req.user._id);
    return respond(res, kyc, 'KYC status retrieved');
  }),

  submitInfo: asyncHandler(async (req, res) => {
    const kyc = await KycService.submitInfo(req.user._id, req.body);
    return respond(res, kyc, 'KYC info submitted');
  }),

  submitDocuments: asyncHandler(async (req, res) => {
    const kyc = await KycService.submitDocuments(req.user._id, req.body);
    return respond(res, kyc, 'KYC documents submitted');
  }),

  submitBankDetails: asyncHandler(async (req, res) => {
    const kyc = await KycService.submitBankDetails(req.user._id, req.body);
    return respond(res, kyc, 'KYC bank details submitted');
  }),

  initiatePayment: asyncHandler(async (req, res) => {
    const order = await KycService.initiatePayment(req.user._id);
    return res.status(StatusCodes.CREATED).json(new ApiResponse(StatusCodes.CREATED, order, 'KYC payment order created'));
  }),

  verifyPayment: asyncHandler(async (req, res) => {
    const kyc = await KycService.verifyPayment(req.user._id, req.body);
    return respond(res, kyc, 'KYC payment verified');
  }),
};
