import { User, Vendor } from '../../core/models/index.js';
import { Booking } from '../../models/booking.model.js';
import { Rating } from '../../models/rating.model.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

/* =======================
   UTILITY FUNCTIONS
======================= */

const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(value);
};

const buildDateRange = ({ startDate, endDate }) => {
  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const end = endDate ? new Date(endDate) : new Date();

  return { start, end };
};

const getPreviousRange = ({ start, end }) => {
  const duration = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - duration),
    end: start,
  };
};

/* =======================
   METRIC CALCULATORS
======================= */

const getTotalRevenue = async ({ start, end }) => {
  const result = await Booking.aggregate([
    {
      $match: {
        status: 'completed',
        paymentStatus: { $in: ['paid', 'partial_refund'] },
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$pricing.totalAmount' },
      },
    },
  ]);

  return result[0]?.total || 0;
};

const getTotalBookings = async ({ start, end }) => {
  return Booking.countDocuments({
    createdAt: { $gte: start, $lte: end },
    status: { $ne: 'cancelled_by_system' },
  });
};

const getActiveUsers = async ({ start, end }) => {
  return User.countDocuments({
    isDeleted: false,
    isBlocked: false,
    updatedAt: { $gte: start, $lte: end },
  });
};

const getVerifiedVendors = async ({ start, end }) => {
  return Vendor.countDocuments({
    isVerified: true,
    isKYCVerified: true,
    kycStatus: 'approved',
    isDeleted: false,
    isBlocked: false,
    createdAt: { $gte: start, $lte: end },
  });
};

const getAverageRating = async ({ start, end }) => {
  const result = await Rating.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: null,
        avg: { $avg: '$ratingValue' },
      },
    },
  ]);

  return result[0]?.avg || 0;
};

/* =======================
   MAIN CONTROLLER
======================= */

export const getPlatformKPIs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const currentRange = buildDateRange({ startDate, endDate });
    const previousRange = getPreviousRange(currentRange);

    const [
      currentRevenue,
      previousRevenue,
      currentBookings,
      previousBookings,
      currentUsers,
      previousUsers,
      currentVendors,
      previousVendors,
      currentRating,
      previousRating,
    ] = await Promise.all([
      getTotalRevenue(currentRange),
      getTotalRevenue(previousRange),

      getTotalBookings(currentRange),
      getTotalBookings(previousRange),

      getActiveUsers(currentRange),
      getActiveUsers(previousRange),

      getVerifiedVendors(currentRange),
      getVerifiedVendors(previousRange),

      getAverageRating(currentRange),
      getAverageRating(previousRange),
    ]);

    const revenueGrowth = calculatePercentageChange(currentRevenue, previousRevenue);
    const bookingsGrowth = calculatePercentageChange(currentBookings, previousBookings);
    const usersGrowth = calculatePercentageChange(currentUsers, previousUsers);
    const vendorsGrowth = calculatePercentageChange(currentVendors, previousVendors);
    const ratingChange = currentRating - previousRating;

    const avgGrowthRate = (revenueGrowth + bookingsGrowth + usersGrowth + vendorsGrowth) / 4;

    const kpis = [
      {
        title: 'Total Revenue',
        value: formatCurrency(currentRevenue),
        rawValue: currentRevenue,
        change: `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`,
        trend: revenueGrowth >= 0 ? 'up' : 'down',
      },
      {
        title: 'Total Bookings',
        value: currentBookings.toLocaleString(),
        rawValue: currentBookings,
        change: `${bookingsGrowth > 0 ? '+' : ''}${bookingsGrowth.toFixed(1)}%`,
        trend: bookingsGrowth >= 0 ? 'up' : 'down',
      },
      {
        title: 'Active Users',
        value: currentUsers.toLocaleString(),
        rawValue: currentUsers,
        change: `${usersGrowth > 0 ? '+' : ''}${usersGrowth.toFixed(1)}%`,
        trend: usersGrowth >= 0 ? 'up' : 'down',
      },
      {
        title: 'Verified Vendors',
        value: currentVendors.toLocaleString(),
        rawValue: currentVendors,
        change: `${vendorsGrowth > 0 ? '+' : ''}${vendorsGrowth.toFixed(1)}%`,
        trend: vendorsGrowth >= 0 ? 'up' : 'down',
      },
      {
        title: 'Average Rating',
        value: currentRating.toFixed(1),
        rawValue: currentRating,
        change: `${ratingChange > 0 ? '+' : ''}${ratingChange.toFixed(1)}`,
        trend: ratingChange >= 0 ? 'up' : 'down',
      },
      {
        title: 'Avg Growth Rate',
        value: `${avgGrowthRate.toFixed(1)}%`,
        rawValue: avgGrowthRate,
        change: `${avgGrowthRate > 0 ? '+' : ''}${avgGrowthRate.toFixed(1)}%`,
        trend: avgGrowthRate >= 0 ? 'up' : 'down',
      },
    ];

    return res.status(200).json(new ApiResponse(200, kpis, 'Platform KPIs retrieved successfully'));
  } catch (error) {
    console.error(error);
    return res.status(500).json(new ApiError(500, error.message || 'Error fetching KPIs'));
  }
};
