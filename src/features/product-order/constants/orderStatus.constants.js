export const PRODUCT_ORDER_MODEL_NAME = 'ProductOrder';

export const PRODUCT_ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PACKED: 'packed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
};

// pending -> confirmed -> packed -> shipped -> delivered is the happy path.
// Cancellation only reachable from pending/confirmed; returned only from delivered.
export const PRODUCT_ORDER_TRANSITIONS = {
  [PRODUCT_ORDER_STATUSES.PENDING]: [PRODUCT_ORDER_STATUSES.CONFIRMED, PRODUCT_ORDER_STATUSES.CANCELLED],
  [PRODUCT_ORDER_STATUSES.CONFIRMED]: [PRODUCT_ORDER_STATUSES.PACKED, PRODUCT_ORDER_STATUSES.CANCELLED],
  [PRODUCT_ORDER_STATUSES.PACKED]: [PRODUCT_ORDER_STATUSES.SHIPPED],
  [PRODUCT_ORDER_STATUSES.SHIPPED]: [PRODUCT_ORDER_STATUSES.DELIVERED],
  [PRODUCT_ORDER_STATUSES.DELIVERED]: [PRODUCT_ORDER_STATUSES.RETURNED],
  [PRODUCT_ORDER_STATUSES.RETURNED]: [],
  [PRODUCT_ORDER_STATUSES.CANCELLED]: [],
};

export const SHIPPING_STATUSES = [
  'pending',
  'shipment-created',
  'picked-up',
  'in-transit',
  'out-for-delivery',
  'delivered',
  'failed',
  'rto',
];

// Best-effort mapping from Shiprocket's webhook status strings to our shippingStatus
// enum — Shiprocket credentials/docs weren't available at implementation time, so
// this is a placeholder guess. Confirm against the real payload shape once
// credentials are provided and adjust the keys here (see ShiprocketAdapter).
export const SHIPROCKET_STATUS_MAP = {
  'NEW ORDER': 'shipment-created',
  'PICKUP GENERATED': 'shipment-created',
  'PICKED UP': 'picked-up',
  'IN TRANSIT': 'in-transit',
  'OUT FOR DELIVERY': 'out-for-delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'failed',
  RTO: 'rto',
};
