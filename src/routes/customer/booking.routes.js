import { Router } from 'express';

import {
  createBooking,
  acceptBookingRequest,
  getVendorActiveBookings,
  getUserActiveBookings,
  addAddOnToBooking,
  updateBookingStatus,
  removeAddOnFromBooking,
  previewBookingPricing,
  addSingleAddOnToBooking,
  removeSingleAddOnFromBooking,
  verifyBookingOtp,
  getVendorAllBookings,
  getVendorBookingHistory,
  getEligibleVendors,
  getVendorBookingTransactionsHistory,
} from '../../controllers/booking/bookingNew.controller.js';
import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';

import {
  cancelBookingByAdmin,
  getAllBookings,
  getBookingById,
  getBookingStatus,
  getLiveBookings,
  getUserBookings,
  getVendorBookings,
} from '../../controllers/booking/booking.controller.js';

const router = Router();

router.route('/service/book').post(authMiddleware(['user']), createBooking);
// router.route('/service/booking-eligible-vendor').post(authMiddleware(['user', 'vendor']), getEligibleVendors);
router.route('/accept-service/:bookingId').post(authMiddleware(['vendor']), acceptBookingRequest);
router.route('/status/:bookingId').get(authMiddleware(['user', 'vendor', 'admin']), getBookingStatus);
router.route('/status/:bookingId').put(authMiddleware(['vendor', 'admin']), updateBookingStatus);
router.route('/preview').post(authMiddleware(['user', 'admin']), previewBookingPricing);

router.route('/all').get(authMiddleware(['admin']), getAllBookings);
router.route('/active').get(authMiddleware(['admin']), getLiveBookings);

// home screen
router.route('/vendor/active').get(authMiddleware(['vendor', 'admin']), getVendorActiveBookings);
router.route('/vendor/transactions').get(authMiddleware(['vendor', 'admin']), getVendorBookingTransactionsHistory);

// upcoming bookings
router.route('/vendor/all').get(authMiddleware(['vendor', 'admin']), getVendorAllBookings);

// past bookings
router.route('/vendor').get(authMiddleware(['vendor']), getVendorBookingHistory);
router.route('/vendor/:vendorId').get(authMiddleware(['admin']), getVendorBookings);

router.route('/user/active').get(authMiddleware(['admin', 'user']), getUserActiveBookings);
router.route('/user/:userId').get(authMiddleware(['admin', 'user']), getUserBookings);

router.post('/addons', authMiddleware(['vendor']), addAddOnToBooking);
router.post('/addons/remove', authMiddleware(['vendor']), removeAddOnFromBooking);

router.post('/addons/single', authMiddleware(['vendor']), addSingleAddOnToBooking);
router.post('/addons/remove/single', authMiddleware(['vendor']), removeSingleAddOnFromBooking);

router.route('/verify-otp').post(authMiddleware(['vendor']), verifyBookingOtp);
router.route('/cancel/:id').put(authMiddleware(['admin']), cancelBookingByAdmin);

router.route('/:id').get(getBookingById);

export default router;
