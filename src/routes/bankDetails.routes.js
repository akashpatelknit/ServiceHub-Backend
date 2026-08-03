import express from 'express';

import {
  createBankAccount,
  getUserBankAccounts,
  getBankAccountById,
  updateBankAccount,
  setPrimaryBankAccount,
  verifyBankAccount,
  approveBankAccount,
  rejectBankAccount,
  deactivateBankAccount,
  reactivateBankAccount,
  deleteBankAccount,
  getBankAccountAnalytics,
  recordTransferUsage,
  getAllBankAccounts,
} from '../controllers/bankDetails/bankDetails.controllers.js';

import { authenticate as authMiddleware } from '../features/auth/middlewares/authenticate.js';

import {
  validateCreateBankAccount,
  validateMongoId,
  validateRecordTransfer,
  validateRejectBankAccount,
  validateUpdateBankAccount,
  validateUserParams,
  validateVerifyBankAccount,
} from '../controllers/bankDetails/bankDetails.validation.js';

const router = express.Router();

router.route('/all').get(authMiddleware(['admin']), getAllBankAccounts);

router
  .route('/')
  .post(validateCreateBankAccount, authMiddleware(['vendor']), createBankAccount)
  .get(authMiddleware(['admin', 'vendor']), getUserBankAccounts);

router
  .route('/:id')
  .get(validateMongoId, getBankAccountById)
  .put(validateMongoId, validateUpdateBankAccount, authMiddleware(['admin', 'vendor']), updateBankAccount)
  .delete(validateMongoId, deleteBankAccount);

router
  .route('/:id/verification')
  .post(validateMongoId, validateVerifyBankAccount, verifyBankAccount) // POST /bank-accounts/:id/verification
  .patch(validateMongoId, validateVerifyBankAccount, verifyBankAccount) // PATCH /bank-accounts/:id/verification
  .delete(validateMongoId, rejectBankAccount); // DELETE /bank-accounts/:id/verification

router.route('/:id/transfers').post(validateMongoId, validateRecordTransfer, recordTransferUsage); // POST /bank-accounts/:id/transfers

router.route('/:id/status').patch(validateMongoId, deactivateBankAccount); // PATCH /bank-accounts/:id/status

router.route('/users/:userId/:userType').get(validateUserParams, getUserBankAccounts); // GET /bank-accounts/users/:userId/:userType

router.route('/users/:userId/:userType/analytics').get(validateUserParams, getBankAccountAnalytics); // GET /bank-accounts/users/:userId/:userType/

router.route('/:id/verification/approval').post(validateMongoId, approveBankAccount); // POST /bank-accounts/:id/verification/approval

router.route('/:id/verification/rejection').post(validateMongoId, validateRejectBankAccount, rejectBankAccount); // POST /bank-accounts/:id/verification/rejection

router.route('/:id/status/activation').post(validateMongoId, reactivateBankAccount); // POST /bank-accounts/:id/status/activation

router.route('/:id/primary').post(validateMongoId, setPrimaryBankAccount); // POST /bank-accounts/:id/primary

export default router;
