import { ADMIN_SUB_ROLE_PERMISSIONS } from '../constants/permissions.constants.js';

export const PermissionService = {
  permissionsFor(subRole) {
    return ADMIN_SUB_ROLE_PERMISSIONS[subRole] ?? {};
  },

  hasPermission(subRole, resource, action) {
    const resourcePermissions = this.permissionsFor(subRole)[resource];
    return Array.isArray(resourcePermissions) && resourcePermissions.includes(action);
  },
};
