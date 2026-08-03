import express from 'express';
import { authenticate as authMiddleware } from '../../../features/auth/middlewares/authenticate.js';
import { validateMongoId } from '../../../middlewares/validation.middleware.js';

import {
  submitKYC,
  getKYCStatus,
  getAllKYCs,
  approveKYC,
  rejectKYC,
  verifyDocument,
} from '../../../controllers/kyc/kyc.controller.js';

const router = express.Router();

// Vendor routes
router.use(authMiddleware(['vendor', 'admin']));
router.post('/', submitKYC);
router.get('/status', getKYCStatus);

// Admin routes
router.use(authMiddleware(['admin']));
router.get('/', getAllKYCs);
router.get('/pending', getPendingKYCs);
router.get('/stats', getKYCStatus);

router
  .route('/:id')
  .get(validateMongoId, getKYCById)
  .patch(validateMongoId, approveKYC)
  .delete(validateMongoId, deleteKYC);

router.patch('/:id/verify-document', validateMongoId, verifyDocument);
router.patch('/:id/reject', validateMongoId, rejectKYC);

export default router;
