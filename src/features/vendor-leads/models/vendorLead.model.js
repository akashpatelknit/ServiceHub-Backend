import mongoose, { Schema } from 'mongoose';

// Interest-registration capture for the "Register as a professional" marketing page —
// service-hub-vendor (the actual vendor app/onboarding flow) doesn't exist yet, so this
// is deliberately just a lead record, not a Vendor/KYC application. No admin UI reads
// this collection yet; leads are inspected directly in the database for now.
const vendorLeadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { timestamps: true }
);

export const VendorLead = mongoose.model('VendorLead', vendorLeadSchema);
