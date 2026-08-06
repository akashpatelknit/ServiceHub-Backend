import Joi from 'joi';
import { ADDRESS_TYPES } from '../../../constants/kyc.constants.js';

// Field names/types must match features/address/models/address.model.js exactly.
export const addressValidationSchema = Joi.object({
  street: Joi.string().trim().required().messages({
    'any.required': 'Street is required',
  }),

  city: Joi.string().trim().required().messages({
    'any.required': 'City is required',
  }),

  state: Joi.string().trim().required().messages({
    'any.required': 'State is required',
  }),

  pinCode: Joi.string()
    .trim()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'any.required': 'PIN code is required',
      'string.pattern.base': 'PIN code must be 6 digits',
    }),

  addressType: Joi.string()
    .valid(...Object.values(ADDRESS_TYPES))
    .default(ADDRESS_TYPES.CURRENT)
    .messages({
      'any.only': `Invalid address type. Must be one of: ${Object.values(ADDRESS_TYPES).join(', ')}`,
    }),

  country: Joi.string().trim().default('India'),

  landmark: Joi.string().trim().allow('', null).optional(),

  label: Joi.string().valid('Home', 'Work', 'Other').optional(),

  geolocation: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }).optional(),
});
