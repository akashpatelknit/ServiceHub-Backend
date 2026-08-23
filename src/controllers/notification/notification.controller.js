import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Notification } from '../../models/notification.model.js';

export const createNotification = asyncHandler(async (req, res, next) => {
  const { title, description, type, image, link, vendors, users } = req.body;

  if (!title) {
    throw new ApiError(400, 'Title is required');
  }

  if (!type || !['user', 'vendor', 'all', 'admin'].includes(type)) {
    throw new ApiError(400, 'Valid notification type is required');
  }

  // Validation based on notification type
  if (type === 'vendor' && (!vendors || vendors.length === 0)) {
    throw new ApiError(400, 'Vendor IDs are required for vendor type notification');
  }

  if (type === 'user' && (!users || users.length === 0)) {
    throw new ApiError(400, 'Customer IDs are required for customer type notification');
  }

  // Create notification
  const notification = await Notification.create({
    title,
    description,
    type,
    image,
    link,
    isSend: true,
    vendors: type === 'vendor' || type === 'all' ? vendors || [] : [],
    users: type === 'customer' || type === 'all' ? users || [] : [],
    admin: req.user._id, // Current admin
  });

  return res.status(201).json(new ApiResponse(201, notification, 'Notification created successfully'));
});

export const getVendorNotifications = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({
    $or: [{ type: 'all' }, { type: 'vendor', vendors: vendorId }],
    isDelete: false,
  })
    .select('-users -admin -vendors -type')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Notification.countDocuments({
    $or: [{ type: 'all' }, { type: 'vendor', vendors: vendorId }],
    isDelete: false,
  }).select('-vendors -users -admin');

  res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      },
      'Vendor notifications fetched successfully'
    )
  );
});

export const getCustomerNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({
    $or: [{ type: 'all' }, { type: 'customer', customers: userId }],
    isDelete: false,
  })
    .select('-users -admin -vendors -type')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Notification.countDocuments({
    $or: [{ type: 'all' }, { type: 'users', customers: userId }],
    isDelete: false,
  }).select('-vendors -users -admin');

  res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      },
      'Customer notifications fetched successfully'
    )
  );
});

export const getAllNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit, type } = req.query;

  const skip = (page - 1) * limit;

  const query = { isDelete: false };

  if (type && ['user', 'vendor', 'all', 'admin'].includes(type)) {
    query.type = type;
  }

  console.log('Query:', query);

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('vendors', 'firstName lastName email')
    .populate('users', 'firstName lastName email');

  const totalCount = await Notification.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
        pagination: {
          totalCount,
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          hasMore: skip + notifications.length < totalCount,
        },
      },
      'All notifications fetched successfully'
    )
  );
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid notification ID');
  }

  const userId = req.user._id;
  const userRole = req.user.role;

  // Build query based on user role
  let query = { _id: id, isDelete: false };

  if (userRole === 'vendor') {
    query.$or = [{ vendors: userId }, { type: 'all' }];
  } else if (userRole === 'customer') {
    query.$or = [{ customers: userId }, { type: 'all' }];
  }
  // Admin can mark any notification as read, so no extra conditions

  const notification = await Notification.findOneAndUpdate(query, { isRead: true }, { new: true });

  if (!notification) {
    throw new ApiError(404, "Notification not found or you don't have access");
  }

  return res.status(200).json(new ApiResponse(200, notification, 'Notification marked as read'));
});

export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;

  // Build query based on user role
  let query = { isDelete: false, isRead: false };

  if (userRole === 'vendor') {
    query.$or = [{ vendors: userId }, { type: 'all' }];
  } else if (userRole === 'customer') {
    query.$or = [{ customers: userId }, { type: 'all' }];
  }
  // Admin handles all unread notifications

  const result = await Notification.updateMany(query, { isRead: true });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { modifiedCount: result.modifiedCount },
        `${result.modifiedCount} notifications marked as read`
      )
    );
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid notification ID');
  }

  const notification = await Notification.findByIdAndUpdate(id, { isDelete: true }, { new: true });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  return res.status(200).json(new ApiResponse(200, null, 'Notification deleted successfully'));
});

export const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;

  let query = { isDelete: false, isRead: false };

  if (userRole === 'vendor') {
    query.$or = [{ vendors: userId }, { type: 'all' }];
  } else if (userRole === 'customer') {
    query.$or = [{ customers: userId }, { type: 'all' }];
  }

  const count = await Notification.countDocuments(query);

  return res.status(200).json(new ApiResponse(200, { count }, 'Unread notification count fetched successfully'));
});

export const sendNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid notification ID');
  }

  const notification = await Notification.findByIdAndUpdate(id, { isSend: true }, { new: true });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  // Here you would typically trigger push notifications or other delivery mechanisms
  // This could call a messaging service, Firebase Cloud Messaging, etc.

  return res.status(200).json(new ApiResponse(200, notification, 'Notification sent successfully'));
});
