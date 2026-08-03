import express from 'express';

import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';
import adminController from '../../controllers/admin/admin.auth.controller.js';

const { createSubAdmin, getAllAdmins, updateAdmin, changeAdminPassword, toggleAdminBlock } = adminController;

const router = express.Router();

// router.route('/me').get(authMiddleware(['admin']), getCurrentAdmin);
router.route('/sub-admin').post(authMiddleware(['admin']), createSubAdmin);

// Get all admins (only full admin)
router.route('/').get(authMiddleware(['admin']), getAllAdmins);

router.route('/:adminId').patch(authMiddleware(['admin']), updateAdmin);

router.route('/:adminId/password').patch(authMiddleware(['admin']), changeAdminPassword);

// Block/Unblock admin (only full admin)
router.route('/:adminId/block').patch(authMiddleware(['admin']), toggleAdminBlock);

// Delete admin (only full admin)
// router.route('/:adminId').delete(authMiddleware(['admin']), deleteAdmin);

export default router;
