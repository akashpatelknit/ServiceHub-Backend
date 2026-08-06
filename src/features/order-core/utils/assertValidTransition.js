import { ApiError } from '../../../utils/index.js';

// Shared state-machine guard for both ServiceOrder and ProductOrder — each feature
// defines its own adjacency list (which statuses a given status may move to) and
// calls this instead of scattering if-chains across controllers/services.
export const assertValidTransition = (transitions, fromStatus, toStatus) => {
  const allowed = transitions[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw new ApiError(409, `Cannot transition order status from "${fromStatus}" to "${toStatus}"`);
  }
};
