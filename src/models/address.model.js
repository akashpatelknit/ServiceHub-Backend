import mongoose from 'mongoose';
import { ADDRESS_TYPES } from '../constants/index.js';
const { Schema } = mongoose;

const AddressSchema = new Schema(
  {
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
  },
  { _id: false }
);

AddressSchema.pre('save', function (next) {
  this.completeAddress = `${this.street}, ${this.landmark ? this.landmark + ', ' : ''}${this.city}, ${this.state} - ${this.pinCode}, ${this.country}`;
  next();
});

export const Address = mongoose.model('Address', AddressSchema);
