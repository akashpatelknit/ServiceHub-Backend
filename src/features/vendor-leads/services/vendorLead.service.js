import { VendorLead } from '../models/vendorLead.model.js';

export const VendorLeadService = {
  create: (data) => VendorLead.create(data),
};
