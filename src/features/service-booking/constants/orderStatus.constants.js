export const SERVICE_ORDER_MODEL_NAME = 'ServiceOrder';

export const SERVICE_ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// pending -> confirmed -> assigned -> in-progress -> completed is the happy path.
// Cancellation is only reachable from the first three stages — once a vendor is
// actively in-progress or the job is done, cancelling no longer makes sense.
export const SERVICE_ORDER_TRANSITIONS = {
  [SERVICE_ORDER_STATUSES.PENDING]: [SERVICE_ORDER_STATUSES.CONFIRMED, SERVICE_ORDER_STATUSES.CANCELLED],
  [SERVICE_ORDER_STATUSES.CONFIRMED]: [SERVICE_ORDER_STATUSES.ASSIGNED, SERVICE_ORDER_STATUSES.CANCELLED],
  [SERVICE_ORDER_STATUSES.ASSIGNED]: [SERVICE_ORDER_STATUSES.IN_PROGRESS, SERVICE_ORDER_STATUSES.CANCELLED],
  [SERVICE_ORDER_STATUSES.IN_PROGRESS]: [SERVICE_ORDER_STATUSES.COMPLETED],
  [SERVICE_ORDER_STATUSES.COMPLETED]: [],
  [SERVICE_ORDER_STATUSES.CANCELLED]: [],
};
