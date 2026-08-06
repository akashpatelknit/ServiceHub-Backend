import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { VendorLeadService } from '../services/vendorLead.service.js';

export const VendorLeadController = {
  create: asyncHandler(async (req, res) => {
    const lead = await VendorLeadService.create(req.body);
    return res
      .status(StatusCodes.CREATED)
      .json(new ApiResponse(StatusCodes.CREATED, { _id: lead._id }, 'Thanks for your interest — our team will reach out soon.'));
  }),
};
