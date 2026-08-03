import express from 'express';
import { getPlatformKPIs, getKPIsSummary } from '../controllers/reports/kpis.controller.js';
import { authenticate as verifyJWT } from '../features/auth/middlewares/authenticate.js';
import { checkPermission } from '../features/auth/middlewares/checkPermission.js';

const router = express.Router();

/**
 * KPI Routes
 * All routes require authentication and admin/staff permissions
 */

// Get all platform KPIs
router.get('/platform', verifyJWT, checkPermission(['admin', 'staff']), getPlatformKPIs);

// Get KPIs summary with additional details
router.get('/summary', verifyJWT, checkPermission(['admin', 'staff']), getKPIsSummary);

export default router;
