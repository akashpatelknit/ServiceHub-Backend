import { Router } from 'express';
import {
  createVendorWalletOrder,
  getPaymentStatus,
  razorpayWebhook,
} from '../../controllers/payment/payment.controller.js';
import { createProductOrder, getUserOrders } from '../../controllers/payment/productPayment.controller.js';

import {
  getVendorTransactions,
  getUserTransactions,
  getAllTransactions,
} from '../../controllers/payment/transaction.controller.js';
import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';

import {
  checkKYCPaymentEligibility,
  createKYCPaymentOrder,
  getKYCPaymentHistory,
  kycPaymentWebhook,
  verifyKYCPayment,
  createSimplePaymentLink,
} from '../../controllers/payment/kycPayment.controller.js';

import { createWalletTopupOrder } from '../../controllers/payment/walletPayment.controller.js';
import { verifyPayment } from '../../controllers/payment/verifyPayment.controller.js';
import { createMembershipOrder } from '../../controllers/payment/subscription.controller.js';
import { createBookingPayment } from '../../controllers/payment/bookingPayment.controller.js';
import { bookCalculatorAppointment } from '../../controllers/payment/calcuatorPayment.controller.js';

const router = Router();

router.route('/payments/verify').post(verifyPayment);

// KYC Payment routes
router.route('/kyc/payment/create').post(authMiddleware(['vendor', 'admin']), createKYCPaymentOrder);
router.route('/kyc/payment/make-payment').post(authMiddleware(['vendor', 'admin']), createSimplePaymentLink);
router.route('/kyc/payment/verify').post(authMiddleware(['vendor', 'admin']), verifyKYCPayment);
router.route('/kyc/payment/history').get(authMiddleware(['vendor', 'admin']), getKYCPaymentHistory);
router.route('/kyc/payment/eligibility').get(authMiddleware(['vendor', 'admin']), checkKYCPaymentEligibility);

router.route('/webhooks/razorpay/kyc-payment').post(kycPaymentWebhook);
router.route('/wallet/topup/create').post(authMiddleware(['vendor']), createWalletTopupOrder);

router.route('/payment-verify').post(razorpayWebhook);
router.route('/payments/status/:transactionId').get(authMiddleware(['admin', 'user', 'vendor']), getPaymentStatus);
router.route('/payments/wallet').post(createVendorWalletOrder);
router.route('/payments/product/create-order').post(authMiddleware(['admin', 'user', 'vendor']), createProductOrder);
router.route('/payments/membership').post(authMiddleware(['admin', 'user', 'vendor']), createMembershipOrder);
router.route('/payments/bookings').post(authMiddleware(['user', 'vendor']), createBookingPayment);
router.route('/payments/appointment').post(authMiddleware(['user']), bookCalculatorAppointment);
router.route('/user/orders/:userId').get(getUserOrders);

// transaction routes
router.route('/transactions').get(authMiddleware(['admin']), getAllTransactions);
router.route('/transactions/vendor/:vendorId').get(authMiddleware(['admin', 'vendor']), getVendorTransactions);
router.route('/transactions/user/:userId').get(authMiddleware(['admin', 'customer']), getUserTransactions);

export default router;
