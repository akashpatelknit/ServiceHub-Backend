import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import Wallet from '../../models/wallet.model.js';
import Transaction from '../../models/transaction.model.js';
import { User, Vendor, Admin } from '../../core/models/index.js';

const createWallet = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(400, 'Validation failed', errors.array()));
  }

  const { userId, userType = 'Vendor', currency = 'INR' } = req.body;

  let user;

  if (userType === 'Vendor') {
    user = await Vendor.findById(userId);
  } else if (userType === 'Admin') {
    user = await Admin.findById(userId);
  } else {
    user = await User.findById(userId);
  }

  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  const existingWallet = await Wallet.findOne({ userId });
  if (existingWallet) {
    return next(new ApiError(409, 'Wallet already exists for this user'));
  }

  const wallet = new Wallet({
    userId,
    userType: userType,
    currency,
  });

  user.wallet = wallet._id;

  await wallet.save();
  await user.save();
  await wallet.populate('userId', 'name email');

  return res.json(new ApiResponse(200, wallet, 'Wallet created successfully'));
});

const getWallet = asyncHandler(async (req, res, next) => {
  const { walletId } = req.params;

  const wallet = await Wallet.findById(walletId)
    .populate('userId', 'name email selfieImage firstName lastName')
    .populate({
      path: 'recentTransactions',
      options: { sort: { createdAt: -1 }, limit: 10 },
      select: 'type amount description status createdAt transactionType',
    });

  if (!wallet) {
    return next(new ApiError(404, 'Wallet not found'));
  }

  console.log(wallet);

  // Check access permissions
  if (!req.user.role === 'admin' && !wallet.userId.equals(req.user._id)) {
    return next(new ApiError(403, 'Access denied'));
  }

  return res.status(200).json(new ApiResponse(200, wallet, 'Wallet retrieved successfully'));
});

const getUserWallet = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const wallet = await Wallet.findOne({ userId })
    .populate('userId', 'name email')
    .populate({
      path: 'recentTransactions',
      options: { sort: { createdAt: -1 }, limit: 10 },
      select: 'type amount description status createdAt',
    });

  if (!wallet) {
    return next(new ApiError(404, 'Wallet not found'));
  }

  return res.status(200).json(new ApiResponse(200, wallet, 'Wallet retrieved successfully'));
});

const addMoney = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', { errors: errors.array() });
    }

    const { walletId } = req.params;
    const { amount, description = 'Money added to wallet', reference } = req.body;

    if (amount <= 0) {
      throw new ApiError(400, 'Amount must be greater than 0');
    }

    const wallet = await Wallet.findById(walletId).session(session);
    if (!wallet) {
      throw new ApiError(404, 'Wallet not found');
    }

    // Access control
    const isOwner = wallet.userId.toString() === req.user.id;
    if (req.user.role !== 'admin' && !isOwner) {
      throw new ApiError(403, 'Access denied');
    }

    // Update wallet balance
    wallet.balance += amount;

    // Create transaction
    const transaction = await Transaction.create(
      [
        {
          walletId: wallet._id,
          userId: wallet.userId,
          type: 'credit',
          amount,
          description,
          reference,
          status: 'completed',
          balanceAfter: wallet.balance,
        },
      ],
      { session }
    );

    // Add to recent transactions
    wallet.recentTransactions.unshift(transaction[0]._id);
    if (wallet.recentTransactions.length > 10) {
      wallet.recentTransactions = wallet.recentTransactions.slice(0, 10);
    }

    await wallet.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          wallet: {
            id: wallet._id,
            balance: wallet.balance,
            availableBalance: wallet.availableBalance,
          },
          transaction: transaction[0],
        },
        'Money added successfully'
      )
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error instanceof ApiError ? error : new ApiError(500, 'Failed to add money', error.message);
  }
});

const deductMoney = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      return next(
        new ApiError(400, 'Validation failed', {
          errors: errors.array(),
        })
      );
    }

    const { walletId } = req.params;
    const { amount, description = 'Money deducted from wallet', reference } = req.body;

    if (amount <= 0) {
      await session.abortTransaction();
      return next(new ApiError(400, 'Amount must be greater than 0'));
    }

    const wallet = await Wallet.findById(walletId).session(session);
    if (!wallet) {
      await session.abortTransaction();
      return next(new ApiError(404, 'Wallet not found'));
    }

    // Check access permissions
    if (!req.user.role.includes('admin') && wallet.userId.toString() !== req.user._id) {
      await session.abortTransaction();
      return next(new ApiError(403, 'Access denied'));
    }

    const canTransact = wallet.canTransact(amount);
    if (!canTransact.canTransact) {
      await session.abortTransaction();
      return next(
        new ApiError(400, 'Transaction not allowed', {
          reasons: canTransact.reasons,
        })
      );
    }

    // Update wallet
    wallet.balance -= amount;
    wallet.updateSpending(amount);
    await wallet.save({ session });

    const transaction = new Transaction({
      walletId: wallet._id,
      userId: wallet.userId,
      type: 'debit',
      amount,
      description,
      reference,
      status: 'completed',
      balanceAfter: wallet.balance,
    });

    await transaction.save({ session });

    // Update recentTransactions
    wallet.recentTransactions.unshift(transaction._id);
    if (wallet.recentTransactions.length > 10) {
      wallet.recentTransactions = wallet.recentTransactions.slice(0, 10);
    }
    await wallet.save({ session });

    await session.commitTransaction();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          wallet: {
            id: wallet._id,
            balance: wallet.balance,
            availableBalance: wallet.availableBalance,
          },
          transaction,
        },
        'Money deducted successfully'
      )
    );
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

const getAllWallets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      userType,
      status,
      currency,
      minBalance,
      maxBalance,
      userId,
      search,
      frozenOnly,
      activeOnly,
      dateFrom,
      dateTo,
      hasRecentTransactions,
      balanceRange,
    } = req.query;

    const filter = {};

    if (userType && userType.toLowerCase() !== 'all' && ['Admin', 'Vendor', 'User'].includes(userType)) {
      filter.userType = userType;
    }

    if (status && status.toLowerCase() !== 'all' && ['active', 'suspended', 'frozen'].includes(status)) {
      filter.status = status;
    }

    if (currency && currency.toLowerCase() !== 'all' && ['INR', 'USD', 'EUR'].includes(currency.toUpperCase())) {
      filter.currency = currency.toUpperCase();
    }

    if (minBalance !== undefined || maxBalance !== undefined) {
      filter.balance = {};
      if (minBalance !== undefined && !isNaN(minBalance) && minBalance !== '') {
        filter.balance.$gte = parseFloat(minBalance);
      }
      if (maxBalance !== undefined && !isNaN(maxBalance) && maxBalance !== '') {
        filter.balance.$lte = parseFloat(maxBalance);
      }
    }

    if (balanceRange && balanceRange.toLowerCase() !== 'all') {
      const ranges = {
        low: { $lt: 1000 },
        medium: { $gte: 1000, $lt: 10000 },
        high: { $gte: 10000, $lt: 100000 },
        'very-high': { $gte: 100000 },
      };
      if (ranges[balanceRange]) {
        filter.balance = ranges[balanceRange];
      }
    }

    if (userId && userId.toLowerCase() !== 'all' && userId.trim() !== '') {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        filter.userId = new mongoose.Types.ObjectId(userId);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid userId format',
        });
      }
    }

    // Frozen only filter
    if (frozenOnly === 'true') {
      filter.frozenBalance = { $gt: 0 };
    }

    // Active only filter
    if (activeOnly === 'true') {
      filter.status = 'active';
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom && dateFrom !== '') {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo && dateTo !== '') {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    // Recent transactions filter
    if (hasRecentTransactions === 'true') {
      filter.recentTransactions = { $exists: true, $ne: [] };
    } else if (hasRecentTransactions === 'false') {
      filter.$or = [{ recentTransactions: { $exists: false } }, { recentTransactions: { $size: 0 } }];
    }

    // Handle search - if search is provided, we'll do it after fetching
    let searchFilter = {};
    if (search && search.trim() !== '') {
      // Basic search on wallet fields only
      searchFilter = {
        $or: [
          { userType: { $regex: search, $options: 'i' } },
          { status: { $regex: search, $options: 'i' } },
          { currency: { $regex: search, $options: 'i' } },
        ],
      };
      // Merge with existing filter
      filter.$and = filter.$and || [];
      filter.$and.push(searchFilter);
    }

    const totalWallets = await Wallet.countDocuments(filter);

    // Sort configuration
    const sortObject = {};
    sortObject[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination calculation
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Fetch wallets with basic query
    const wallets = await Wallet.find(filter)
      .populate('userId')
      .sort(sortObject)
      .skip(skip)
      .limit(limitNum)
      .lean()
      .exec();

    // Enhance wallets with computed fields
    const enhancedWallets = wallets.map((wallet) => {
      const availableBalance = wallet.balance - (wallet.frozenBalance || 0);
      const hasRecentActivity = wallet.recentTransactions && wallet.recentTransactions.length > 0;

      let balanceStatus = 'Very High';
      if (wallet.balance < 1000) balanceStatus = 'Low';
      else if (wallet.balance < 10000) balanceStatus = 'Medium';
      else if (wallet.balance < 100000) balanceStatus = 'High';

      return {
        ...wallet,
        availableBalance,
        hasRecentActivity,
        balanceStatus,
        // Add formatted fields for frontend
        formattedBalance: new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: wallet.currency || 'INR',
        }).format(wallet.balance),
        formattedAvailableBalance: new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: wallet.currency || 'INR',
        }).format(availableBalance),
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalWallets / limitNum);
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    // Get basic statistics (simplified)
    const statisticsPromises = [
      Wallet.countDocuments({ status: 'active' }),
      Wallet.countDocuments({ status: 'suspended' }),
      Wallet.countDocuments({ status: 'frozen' }),
      Wallet.countDocuments({ frozenBalance: { $gt: 0 } }),
      Wallet.aggregate([{ $group: { _id: '$userType', count: { $sum: 1 } } }]),
      Wallet.aggregate([{ $group: { _id: '$currency', totalBalance: { $sum: '$balance' }, count: { $sum: 1 } } }]),
    ];

    const [activeWallets, suspendedWallets, frozenWallets, walletsWithFrozenBalance, userTypeStats, currencyStats] =
      await Promise.all(statisticsPromises);

    // Prepare response
    const response = {
      success: true,
      data: {
        wallets: enhancedWallets,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          total: totalWallets,
          limit: limitNum,
          hasNextPage,
          hasPrevPage,
          skip,
          showing: `${skip + 1}-${Math.min(skip + limitNum, totalWallets)} of ${totalWallets}`,
        },
        statistics: {
          total: totalWallets,
          active: activeWallets,
          suspended: suspendedWallets,
          frozen: frozenWallets,
          withFrozenBalance: walletsWithFrozenBalance,
          byUserType: userTypeStats,
          byCurrency: currencyStats,
        },
      },
      message: `Retrieved ${enhancedWallets.length} wallet(s) successfully`,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching wallets:', error);

    // Send detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Internal server error';

    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallets',
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
};

const getWalletStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      // Total wallets by status
      Wallet.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

      // Total balance by currency and status
      Wallet.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$currency', totalBalance: { $sum: '$balance' }, count: { $sum: 1 } } },
      ]),

      // User type distribution
      Wallet.aggregate([{ $group: { _id: '$userType', count: { $sum: 1 }, totalBalance: { $sum: '$balance' } } }]),

      // Top 10 wallets by balance
      Wallet.find({ status: 'active' })
        .sort({ balance: -1 })
        .limit(10)
        .populate('userId', 'name email', null, { strictPopulate: false }),

      // Wallets with frozen balance
      Wallet.countDocuments({ frozenBalance: { $gt: 0 } }),

      // Recently created wallets (last 7 days)
      Wallet.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const [
      walletsByStatus,
      balanceByCurrency,
      userTypeDistribution,
      topWallets,
      walletsWithFrozenBalance,
      recentWallets,
    ] = stats;

    res.status(200).json({
      success: true,
      data: {
        walletsByStatus,
        balanceByCurrency,
        userTypeDistribution,
        topWallets,
        walletsWithFrozenBalance,
        recentWallets,
      },
      message: 'Wallet statistics retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching wallet statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

export const freezeWalletAmount = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, userType, amount, reason } = req.body;

    console.log(userId, userType, amount, reason, req.body);

    if (!userId || !userType || !amount) {
      throw new ApiError(400, 'userId, userType and amount are required');
    }

    if (amount <= 0) {
      throw new ApiError(400, 'Amount must be greater than zero');
    }

    const wallet = await Wallet.findOne({ userId, userType }).session(session);

    if (!wallet) {
      throw new ApiError(404, 'Wallet not found');
    }

    if (wallet.status !== 'active') {
      throw new ApiError(403, 'Wallet is not active');
    }

    const availableBalance = wallet.balance - wallet.frozenBalance;

    if (availableBalance < amount) {
      throw new ApiError(400, 'Insufficient available balance to freeze');
    }

    // Update balances
    wallet.balance -= amount;
    wallet.frozenBalance += amount;

    await wallet.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: 'Amount frozen successfully',
      data: {
        walletId: wallet._id,
        frozenAmount: amount,
        balance: wallet.balance,
        frozenBalance: wallet.frozenBalance,
        reason: reason || null,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const releaseFrozenAmount = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, userType, amount, reason } = req.body;

    if (!userId || !userType || !amount) {
      throw new ApiError(400, 'userId, userType and amount are required');
    }

    if (amount <= 0) {
      throw new ApiError(400, 'Amount must be greater than zero');
    }

    const wallet = await Wallet.findOne({ userId, userType }).session(session);

    if (!wallet) {
      throw new ApiError(404, 'Wallet not found');
    }

    if (wallet.status === 'suspended') {
      throw new ApiError(403, 'Wallet is suspended');
    }

    if (wallet.frozenBalance < amount) {
      throw new ApiError(400, 'Insufficient frozen balance to release');
    }

    // Release funds
    wallet.frozenBalance -= amount;
    wallet.balance += amount;

    await wallet.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: 'Frozen amount released successfully',
      data: {
        walletId: wallet._id,
        releasedAmount: amount,
        balance: wallet.balance,
        frozenBalance: wallet.frozenBalance,
        reason: reason || null,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export { createWallet, getWallet, getUserWallet, addMoney, deductMoney, getAllWallets, getWalletStats };
