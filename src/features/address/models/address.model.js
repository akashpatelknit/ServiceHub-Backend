import mongoose from 'mongoose';
import { ADDRESS_TYPES } from '../../../constants/index.js';
const { Schema } = mongoose;

const AddressSchema = new Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pinCode: {
    type: String,
    required: true,
    match: [/^\d{6}$/, 'PIN code must be 6 digits'],
  },
  addressType: {
    type: String,
    enum: Object.values(ADDRESS_TYPES),
    default: ADDRESS_TYPES.CURRENT,
  },
  country: {
    type: String,
    default: 'India',
  },
  landmark: {
    type: String,
    default: null,
  },
  completeAddress: {
    type: String,
    default: null,
  },

  // Ownership — who this address belongs to. Not `required` at the schema level yet:
  // existing docs predate these fields (see migrations/) and application code is the
  // one place that must always set them going forward.
  ownerType: {
    type: String,
    enum: ['User', 'Vendor'],
  },
  owner: {
    type: Schema.Types.ObjectId,
    refPath: 'ownerType',
  },

  label: {
    type: String,
    enum: ['Home', 'Work', 'Other'],
    default: 'Other',
  },

  // For future serviceability checks — not populated by every caller.
  geolocation: {
    lat: { type: Number },
    lng: { type: Number },
  },

  isDefault: {
    type: Boolean,
    default: false,
  },
});

AddressSchema.index({ owner: 1, ownerType: 1, isDefault: 1 });

AddressSchema.pre('save', function (next) {
  this.completeAddress = `${this.street}, ${this.landmark ? this.landmark + ', ' : ''}${this.city}, ${this.state} - ${this.pinCode}, ${this.country}`;
  next();
});

export const Address = mongoose.model('Address', AddressSchema);
