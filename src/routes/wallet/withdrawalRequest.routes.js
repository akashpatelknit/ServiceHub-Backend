import express from 'express';

import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';
import {
  approveWithdrawal,
  createWithdrawalRequest,
  getAllWithdrawals,
  getMyWithdrawals,
  rejectWithdrawal,
} from '../../controllers/wallet/withdrawalRequest.controller.js';

const router = express.Router();

router.post('/request', authMiddleware(['vendor']), createWithdrawalRequest);
router.get('/request', authMiddleware(['admin']), getAllWithdrawals);
router.get('/my-request', authMiddleware(['vendor']), getMyWithdrawals);

router.patch('/admin/reject/:id', authMiddleware(['admin']), rejectWithdrawal);
router.patch('/admin/approve/:id', authMiddleware(['admin']), approveWithdrawal);

router.patch('/admin/priority/:id', authMiddleware(['vendor']));

export default router;
