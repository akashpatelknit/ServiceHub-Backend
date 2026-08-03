import { ApiError } from '../../../utils/index.js';

const REQUEST_PARTS = ['body', 'params', 'query'];

/**
 * The single reusable Zod entry point for this module — every route passes
 * a `{ body?, params?, query? }` schema map here instead of validating inline.
 */
export const validate = (schema) => (req, _res, next) => {
  const errors = [];

  for (const part of REQUEST_PARTS) {
    if (!schema[part]) continue;

    const result = schema[part].safeParse(req[part]);
    if (!result.success) {
      errors.push(...result.error.issues.map((issue) => ({ field: `${part}.${issue.path.join('.')}`, message: issue.message })));
      continue;
    }

    req[part] = result.data;
  }

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation failed', errors));
  }

  next();
};
