import config from '../config/config.js';

export const DB_NAME = 'servicehub';

const testVendorPhoneNumber = '9876543210';
const testUserPhoneNumber = '9876543210';
const testMobileOTP = '123456';

const KYC_STATUSES = {
  INCOMPLETE: 'incomplete',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  UNDER_REVIEW: 'under_review',
};

const DOCUMENT_TYPES = {
  PASSPORT: 'passport',
  DRIVING_LICENSE: 'driving_license',
  NATIONAL_ID: 'national_id',
  VOTER_ID: 'voter_id',
  PAN_CARD: 'pan_card',
  AADHAAR: 'aadhaar',
};

const ADDRESS_TYPES = {
  PERMANENT: 'permanent',
  CURRENT: 'current',
  BUSINESS: 'business',
  CORRESPONDENCE: 'correspondence',
  OTHER: 'other',
};

const PAYMENT_TYPES = {
  KYC: 'kyc_payment',
  PRODUCT: 'product_payment',
};

export const BOOKING_STATUSES = {
  PENDING: 'pending',
  SEARCHING: 'searching',
  VENDOR_ASSIGNED: 'vendor_assigned',
  ACCEPTED: 'accepted',
  CONFIRMED: 'confirmed',
  ON_ROUTE: 'on_route',
  ARRIVED: 'arrived',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED_BY_USER: 'cancelled_by_user',
  CANCELLED_BY_VENDOR: 'cancelled_by_vendor',
  CANCELLED_BY_SYSTEM: 'cancelled_by_system',
  REJECTED: 'rejected',
  FAILED: 'failed',
  EXPIRED: 'expired',
};

export const PRICING_CONSTANTS = {
  DEFAULT_SEARCH_RADIUS: 5, // km
  MAX_SEARCH_RADIUS: 15, // km
  BOOKING_REQUEST_TIMEOUT: 300, // seconds (5 minutes)
  VENDOR_RESPONSE_TIMEOUT: 60, // seconds (1 minute)
  BOOKING_SEARCH_TIMEOUT: 300, // seconds (5 minutes)
  PLATFORM_FEE_PERCENTAGE: 10, // 10%
  TAX_PERCENTAGE: 18, // 18% GST
  MINIMUM_BOOKING_AMOUNT: 100, // minimum amount in currency
  MAXIMUM_BOOKING_AMOUNT: 50000, // maximum amount in currency
  SERVICE_CHARGE: 50, // fixed service charge
  CANCELLATION_FEE_PERCENTAGE: 20, // 20% cancellation fee

  TAX_RATE: 0,
  PLATFORM_FEE_RATE: 0,
  DEFAULT_SEARCH_RADIUS: 10, // km
  MAX_SEARCH_RADIUS: 50, // km
  BOOKING_SEARCH_TIMEOUT: 900,
  VENDOR_RESPONSE_TIMEOUT: 300,
};

export const VENDOR_RESPONSE_TYPES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  TIMEOUT: 'timeout',
};

export const NOTIFICATION_TYPES = {
  NEW_BOOKING_REQUEST: 'new_booking_request',
  BOOKING_ACCEPTED: 'booking_accepted',
  BOOKING_CANCELLED: 'booking_cancelled',
  VENDOR_ASSIGNED: 'vendor_assigned',
  VENDOR_ON_ROUTE: 'vendor_on_route',
  VENDOR_ARRIVED: 'vendor_arrived',
  SERVICE_STARTED: 'service_started',
  SERVICE_COMPLETED: 'service_completed',
  BOOKING_EXPIRED: 'booking_expired',
  BOOKING_FAILED: 'booking_failed',
};

export const PAYMENT_STATUSES = {
  UNPAID: 'unpaid',
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIAL_REFUND: 'partial_refund',
};

export const USER_ROLES = {
  USER: 'user',
  VENDOR: 'vendor',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

export const SERVICE_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLOCKED: 'blocked',
  DELETED: 'deleted',
  PENDING_APPROVAL: 'pending_approval',
};

export const VENDOR_VERIFICATION_STATUSES = {
  INCOMPLETE: 'incomplete',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const TIME_SLOTS = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
];

export const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  SERVICE_NOT_FOUND: 'SERVICE_NOT_FOUND',
  VENDOR_NOT_FOUND: 'VENDOR_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  NO_VENDORS_AVAILABLE: 'NO_VENDORS_AVAILABLE',
  BOOKING_CONFLICT: 'BOOKING_CONFLICT',
  BOOKING_EXPIRED: 'BOOKING_EXPIRED',
  VENDOR_NOT_ELIGIBLE: 'VENDOR_NOT_ELIGIBLE',
  VENDOR_ALREADY_RESPONDED: 'VENDOR_ALREADY_RESPONDED',
  BOOKING_ALREADY_ASSIGNED: 'BOOKING_ALREADY_ASSIGNED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
};

export const SUCCESS_MESSAGES = {
  BOOKING_CREATED: 'Booking created successfully',
  BOOKING_ACCEPTED: 'Booking accepted successfully',
  BOOKING_UPDATED: 'Booking updated successfully',
  BOOKING_CANCELLED: 'Booking cancelled successfully',
  PAYMENT_PROCESSED: 'Payment processed successfully',
  NOTIFICATION_SENT: 'Notification sent successfully',
  VENDOR_NOTIFIED: 'Vendors notified successfully',
};

export const FCM_CHANNELS = {
  BOOKING_REQUESTS: 'booking_requests',
  BOOKING_UPDATES: 'booking_updates',
  PAYMENT_UPDATES: 'payment_updates',
  GENERAL_NOTIFICATIONS: 'general_notifications',
};

export const ANALYTICS_EVENTS = {
  BOOKING_CREATED: 'booking_created',
  BOOKING_ACCEPTED: 'booking_accepted',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_COMPLETED: 'booking_completed',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  VENDOR_RESPONSE: 'vendor_response',
  USER_LOCATION_UPDATED: 'user_location_updated',
};

export const STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

const IS_DEV_MODE = config.NODE_ENV === 'development';
const DEV_OTP = '123456';

console.log(`⚙️  Application running in ${IS_DEV_MODE ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);

const STEPS = {
  COMPLETE_KYC: 'COMPLETE_KYC',
};

const VERIFICATION_STATUSES = {
  INCOMPLETE: 'incomplete',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export {
  KYC_STATUSES,
  ADDRESS_TYPES,
  DOCUMENT_TYPES,
  PAYMENT_TYPES,
  IS_DEV_MODE,
  DEV_OTP,
  STEPS,
  VERIFICATION_STATUSES,
  testVendorPhoneNumber,
  testUserPhoneNumber,
  testMobileOTP,
};

export const allowedOrigins = [
  'http://localhost:5173',
  'https://servicehub-akashbuilds.vercel.app',
  'https://service-hub-customer.vercel.app',
];
