export const USER_ROLES = Object.freeze({
  USER: 'user',
  VENDOR: 'vendor',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
});

export const USER_STATUSES = Object.freeze({
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  DELETED: 'deleted',
});

export const USER_TYPES = Object.freeze({
  CUSTOMER: 'customer',
  VENDOR: 'vendor',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
});

export const USER_VERIFICATION_STATUSES = Object.freeze({
  INCOMPLETE: 'incomplete',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

export const USER_VERIFICATION_TYPES = Object.freeze({
  EMAIL: 'email',
  PHONE: 'phone',
});

export const USER_VERIFICATION_STEPS = Object.freeze({
  COMPLETE_EMAIL: 'COMPLETE_EMAIL',
  COMPLETE_PHONE: 'COMPLETE_PHONE',
});
