import { Router } from 'express';
import { authenticate } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { DashboardController } from '../controllers/dashboard.controller.js';
import {
  dashboardSummarySchema,
  dashboardRevenueTrendSchema,
  dashboardCategoryPerformanceSchema,
  dashboardRecentActivitySchema,
} from '../validators/dashboard.validation.js';

// No checkPermission gate — every admin sub-role lands here regardless of which
// resource permissions they hold, same as the panel's own "/" landing route.
const router = Router();

router.use(authenticate);

router.get('/summary', validate(dashboardSummarySchema), DashboardController.summary);
router.get('/revenue-trend', validate(dashboardRevenueTrendSchema), DashboardController.revenueTrend);
router.get('/category-performance', validate(dashboardCategoryPerformanceSchema), DashboardController.categoryPerformance);
router.get('/action-needed', DashboardController.actionNeeded);
router.get('/recent-activity', validate(dashboardRecentActivitySchema), DashboardController.recentActivity);

export default router;
