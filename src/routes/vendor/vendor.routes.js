import express from 'express';

import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';

import {
  getAllVendors,
  getVendorById,
  getVendorStats,
  toggleVendorStatus,
} from '../../controllers/vendor/vendor.controller.js';

import { daeFilter } from '../../middlewares/dateFilter.js';

import {
  submitKYC,
  getKYCStats,
  getKYCById,
  getKYCStatus,
  deleteKYC,
  getAllKYCs,
  getPendingKYCs,
  markForReview,
  rejectKYC,
  updateKYCStatus,
  updatePaymentStatus,
} from '../../controllers/vendor/kyc.controller.js';

const router = express.Router();

router.use(daeFilter);

//vendor routes
router.route('/vendors').get(getAllVendors);
router.route('/vendor/toggle-status').patch(authMiddleware(['admin', 'vendor']), toggleVendorStatus);
router.route('/vendor/stats').get(authMiddleware(['admin', 'vendor']), getVendorStats);
router.route('/vendor/:id').get(authMiddleware(['admin']), getVendorById);

router
  .route('/vendor-kyc')
  .post(authMiddleware(['vendor', 'admin']), submitKYC)
  .get(authMiddleware(['admin']), getAllKYCs);
router.route('/vendor-kyc/status').get(authMiddleware(['vendor', 'admin']), getKYCStatus);
router.route('/vendor-kyc/pending').get(authMiddleware(['admin']), getPendingKYCs);
router.route('/vendor-kyc/stats').get(authMiddleware(['admin']), getKYCStats);
router
  .route('/vendor-kyc/:id')
  .get(authMiddleware(['admin']), getKYCById)
  .delete(authMiddleware(['admin']), deleteKYC);

router.route('/vendor-kyc/:id/payment').patch(authMiddleware(['admin']), updatePaymentStatus);
router.route('/vendor-kyc/:kycId/update').patch(authMiddleware(['admin']), updateKYCStatus);
router.route('/vendor-kyc/:id/reject').patch(authMiddleware(['admin']), rejectKYC);
router.route('/vendor-kyc/:id/review').patch(authMiddleware(['admin']), markForReview);

export default router;
