import Joi from 'joi';
import { DOCUMENT_TYPES } from '../../constants/kyc.constants.js';

const objectId = Joi.string().hex().length(24).message('Invalid MongoDB ObjectId');

const pinCodeRegex = /^\d{6}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

const dobValidator = (value, helpers) => {
  const age = Math.floor((Date.now() - new Date(value)) / (1000 * 60 * 60 * 24 * 365));

  if (age < 18) return helpers.message('You must be at least 18 years old');

  if (age > 100) return helpers.message('Invalid date of birth');

  return value;
};

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    req[property] = value;
    next();
  };
};

// Create KYC
const createKYCSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required(),

  lastName: Joi.string().trim().min(2).max(50).required(),

  dateOfBirth: Joi.date().iso().required().custom(dobValidator),

  companyName: Joi.string().trim().min(2).max(100).required(),

  gstNumber: Joi.string().trim().pattern(gstRegex).required(),

  panNumber: Joi.string().trim().pattern(panRegex).required(),

  businessAddress: Joi.object({
    street: Joi.string().trim().required(),
    city: Joi.string().trim().required(),
    state: Joi.string().trim().required(),
    pinCode: Joi.string().pattern(pinCodeRegex).required(),
  }).required(),
});

// Update KYC
const updateKYCSchema = createKYCSchema.fork(Object.keys(createKYCSchema.describe().keys), (field) => field.optional());

// Add document
const addDocumentSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(DOCUMENT_TYPES))
    .required(),

  url: Joi.string().uri().required(),
});

// Update document
const updateDocumentSchema = Joi.object({
  url: Joi.string().uri().required(),
});

// Approve KYC
const approveKYCSchema = Joi.object({
  comments: Joi.string().trim().max(500).optional(),
});

// Reject KYC
const rejectKYCSchema = Joi.object({
  reason: Joi.string().trim().min(10).max(500).required(),
});

// Search KYCs
const searchKYCsSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(KYC_STATUS))
    .optional(),

  gstNumber: Joi.string().trim().optional(),
  panNumber: Joi.string().trim().optional(),
  companyName: Joi.string().trim().optional(),

  submittedFrom: Joi.date().iso().optional(),
  submittedTo: Joi.date().iso().optional(),

  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

// Expiring KYCs
const expiringKYCsSchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).optional(),
});

// Pagination
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

export const validateCreateKYC = validate(createKYCSchema);

export const validateUpdateKYC = validate(updateKYCSchema);

export const validateAddDocument = validate(addDocumentSchema);
export const validateUpdateDocument = [
  validate(Joi.object({ documentId: objectId.required() }), 'params'),
  validate(updateDocumentSchema),
];

export const validateDeleteDocument = validate(Joi.object({ documentId: objectId.required() }), 'params');

export const validateApproveKYC = [
  validate(Joi.object({ kycId: objectId.required() }), 'params'),
  validate(approveKYCSchema),
];

export const validateRejectKYC = [
  validate(Joi.object({ kycId: objectId.required() }), 'params'),
  validate(rejectKYCSchema),
];

export const validateRejectDocument = [
  validate(
    Joi.object({
      kycId: objectId.required(),
      documentId: objectId.required(),
    }),
    'params'
  ),
  validate(rejectKYCSchema),
];

export const validateSearchKYCs = validate(searchKYCsSchema, 'query');

export const validateExpiringKYCs = validate(expiringKYCsSchema, 'query');

export const validatePagination = validate(paginationSchema, 'query');

export const validateKYCId = validate(Joi.object({ kycId: objectId.required() }), 'params');
