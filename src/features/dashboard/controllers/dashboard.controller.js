import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { DashboardService } from '../services/dashboard.service.js';

export const DashboardController = {
  summary: asyncHandler(async (req, res) => {
    const data = await DashboardService.getSummary(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, data, 'Dashboard summary retrieved'));
  }),

  revenueTrend: asyncHandler(async (req, res) => {
    const data = await DashboardService.getRevenueTrend(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, data, 'Revenue trend retrieved'));
  }),

  categoryPerformance: asyncHandler(async (req, res) => {
    const data = await DashboardService.getCategoryPerformance(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, data, 'Category performance retrieved'));
  }),

  actionNeeded: asyncHandler(async (req, res) => {
    const data = await DashboardService.getActionNeeded();
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, data, 'Action-needed counts retrieved'));
  }),

  recentActivity: asyncHandler(async (req, res) => {
    const data = await DashboardService.getRecentActivity(req.query);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, data, 'Recent activity retrieved'));
  }),
};
