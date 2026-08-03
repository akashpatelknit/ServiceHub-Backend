import { Router } from 'express';
import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';
import { userStatsController } from '../../controllers/reports/user.report.controller.js';

const router = Router();

// Get my own stats
router.route('/user/me').get(authMiddleware(['admin', 'user']), userStatsController.getMyStats);

// Admin dashboard
router.route('/user/dashboard').get(authMiddleware(['admin']), userStatsController.getDashboardStats);

// All users stats
router.route('/user/all').get(authMiddleware(['admin', 'user']), userStatsController.getAllUsersStats);

// User growth report
router.route('/user/growth').get(authMiddleware(['admin', 'user']), userStatsController.getUserGrowthStats);

// Top referrers
router.route('/user/top-referrers').get(authMiddleware(['admin', 'user']), userStatsController.getTopReferrers);

// Filtered stats
router.route('/user/filtered').get(authMiddleware(['admin', 'user']), userStatsController.getFilteredStats);

// Export stats
router.route('/user/export').get(authMiddleware(['admin', 'user']), userStatsController.exportStats);

// Single user stats
router.route('/user/:userId').get(userStatsController.getUserStats);

// User activity stats
router.route('/user/:userId/activity').get(userStatsController.getUserActivityStats);

export default router;
