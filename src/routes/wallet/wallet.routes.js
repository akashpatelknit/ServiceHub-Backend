import { Router } from 'express';
import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';

import rateLimit from 'express-rate-limit';
import {
  addMoney,
  createWallet,
  deductMoney,
  freezeWalletAmount,
  getAllWallets,
  getUserWallet,
  getWallet,
  releaseFrozenAmount,
} from '../../controllers/wallet/wallet.controller.js';

import {
  amountValidation,
  createWalletValidation,
  walletIdValidation,
} from '../../controllers/wallet/wallet.validation.js';

export const walletRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// router.use(walletRateLimit);

router.route('/').post(createWalletValidation, authMiddleware(['admin', 'vendor']), createWallet);
router.route('/my-wallet').get(authMiddleware(['vendor', 'admin']), getUserWallet);
router.route('/all').get(authMiddleware(['admin']), getAllWallets);
router.route('/freeze-amount').post(authMiddleware(['admin']), freezeWalletAmount);
router.route('/release-amount').post(authMiddleware(['admin']), releaseFrozenAmount);
// router.route('/stats').get(authMiddleware(['admin']), getWalletStats);
router.route('/:walletId').get(walletIdValidation, authMiddleware(['admin']), getWallet);
router.route('/:walletId/add-money').post(walletIdValidation, amountValidation, addMoney);
router.route('/:walletId/deduct-money').post(walletIdValidation, amountValidation, deductMoney);

export default router;
