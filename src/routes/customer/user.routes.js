import { Router } from 'express';
import { authenticateUser, verifyOtp } from '../../controllers/customer/auth.controller.js';
import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';
import {
  addUserAddress,
  deleteUser,
  deleteUserAddress,
  getAllUsers,
  getCurrentUser,
  getUserAddresses,
  setDefaultAddress,
  updateProfile,
  updateUserAddress,
} from '../../controllers/customer/user.controller.js';
import { uploadSingle } from '../../middlewares/multer.middleware.js';
import { checkSameUser } from '../../middlewares/checkSameUser.middleware.js';

const router = Router();

router.route('/authenticate').post(authenticateUser);
router.route('/verify').post(verifyOtp);
router.get('/current-user', authMiddleware(['user', 'admin']), getCurrentUser);
router.put('/profile', authMiddleware(['user', 'admin']), uploadSingle.single('image'), updateProfile);

router.get('/addresses', authMiddleware(['user', 'admin']), getUserAddresses);
router.post('/addresses', authMiddleware(['user', 'admin']), addUserAddress);
router.put('/address/:addressId', authMiddleware(['user', 'admin']), updateUserAddress);
router.delete('/address/:addressId', authMiddleware(['user', 'admin']), deleteUserAddress);
router.patch('/address/:addressId/default', authMiddleware(['user', 'admin']), setDefaultAddress);

router.route('/all').get(authMiddleware(['admin']), getAllUsers);

router.route('/').delete(authMiddleware(['user', 'admin']), checkSameUser(), deleteUser);

export default router;
