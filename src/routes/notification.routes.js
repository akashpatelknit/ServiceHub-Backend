import express from 'express';
import {
  createNotification,
  getVendorNotifications,
  getCustomerNotifications,
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  sendNotification,
} from '../controllers/notification/notification.controller.js';
import { authenticate as authMiddleware } from '../features/auth/middlewares/authenticate.js';

const router = express.Router();

router.route('/notification').get(authMiddleware(['admin']), getAllNotifications);
router.route('/notification').post(authMiddleware(['admin', 'vendor', 'user']), createNotification);
router.route('/notification/:id').delete(authMiddleware(['admin']), deleteNotification);
router.route('/notification/:id/send').patch(authMiddleware(['admin']), sendNotification);

router.route('/notification/vendor').get(authMiddleware(['vendor']), getVendorNotifications);
router.route('/notification/customer').get(authMiddleware(['customer']), getCustomerNotifications);

router.route('/notification/:id/read').patch(authMiddleware(['admin', 'vendor', 'user']), markNotificationAsRead);
router.route('/notification/read-all').patch(authMiddleware(['admin', 'vendor', 'user']), markAllNotificationsAsRead);
router.route('/notification/count').get(authMiddleware(['admin', 'vendor', 'user']), getUnreadNotificationCount);

export default router;
