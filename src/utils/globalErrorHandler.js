import { ApiError } from '../utils/ApiError.js';

const errorResponse = (res, statusCode, message, errors = [], details = null) => {
  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    ...(errors.length > 0 && { errors }),
    ...(details && { details }),
  });
};

const handleCastError = (err) => {
  const message = `Invalid ID format: ${err.path} should be an ObjectId. Received: ${err.value}`;
  return new ApiError(400, message, [{ field: err.path, message }]);
};

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0];
  const value = err.keyValue ? err.keyValue[field] : 'unknown';
  const message = `Duplicate value for field '${field}': '${value}'. Please use a different value.`;

  return new ApiError(400, message, [{ field, message }]);
};

const handleValidationError = (err) => {
  const errors = Object.entries(err.errors).map(([field, val]) => ({ field, message: val.message }));
  const message = `Validation failed: ${errors.map((e) => e.message).join('. ')}`;

  return new ApiError(400, message, errors);
};

const globalErrorHandler = (error, req, res, next) => {
  console.error('Global Error Handler:', error);

  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  let formattedError = error;

  if (error.name === 'CastError') formattedError = handleCastError(error);
  if (error.code === 11000) formattedError = handleDuplicateKeyError(error);
  if (error.name === 'ValidationError') formattedError = handleValidationError(error);

  const errors = Array.isArray(formattedError.errors) ? formattedError.errors : [];

  if (process.env.NODE_ENV === 'development') {
    return errorResponse(res, formattedError.statusCode, formattedError.message, errors, {
      stack: formattedError.stack,
      errorType: formattedError.name || formattedError.code || 'Unknown Error',
    });
  }

  return errorResponse(res, formattedError.statusCode, formattedError.message, errors);
};

export default globalErrorHandler;
