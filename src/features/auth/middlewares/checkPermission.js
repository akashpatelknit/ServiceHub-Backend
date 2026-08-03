import { ApiError, asyncHandler } from '../../../utils/index.js';
import { IDENTITIES } from '../constants/roles.constants.js';
import { PermissionService } from '../services/permission.service.js';

/**
 * Gates a route on top-level identity (must be admin) and, within that,
 * the admin's sub-role permission for `resource`/`action`.
 */
export const checkPermission = (resource, action) =>
  asyncHandler(async (req, _res, next) => {
    if (req.identity !== IDENTITIES.ADMIN) {
      throw new ApiError(403, 'Admin access required');
    }

    if (!PermissionService.hasPermission(req.user?.subRole, resource, action)) {
      throw new ApiError(403, `Insufficient permissions: ${action} on ${resource}`);
    }

    next();
  });
