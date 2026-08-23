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
import { authenticate, requireIdentity } from '../features/auth/middlewares/authenticate.js';
import { IDENTITIES } from '../features/auth/constants/roles.constants.js';

const router = express.Router();

router.route('/notification').get(authenticate, requireIdentity(IDENTITIES.ADMIN), getAllNotifications);
router.route('/notification').post(authenticate, createNotification);
router.route('/notification/:id').delete(authenticate, requireIdentity(IDENTITIES.ADMIN), deleteNotification);
router.route('/notification/:id/send').patch(authenticate, requireIdentity(IDENTITIES.ADMIN), sendNotification);

router.route('/notification/vendor').get(authenticate, requireIdentity(IDENTITIES.VENDOR), getVendorNotifications);
router.route('/notification/customer').get(authenticate, requireIdentity(IDENTITIES.USER), getCustomerNotifications);

router.route('/notification/:id/read').patch(authenticate, markNotificationAsRead);
router.route('/notification/read-all').patch(authenticate, markAllNotificationsAsRead);
router.route('/notification/count').get(authenticate, getUnreadNotificationCount);

export default router;
