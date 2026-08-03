import { User, Vendor } from '../../core/models/index.js';

const registerFcmToken = async (req, res) => {
  try {
    const { fcmToken, deviceId, platform, deviceName } = req.body;
    const userId = req.user._id;

    if (!fcmToken || !deviceId || !platform) {
      return res.status(400).json({
        success: false,
        message: 'FCM token, device ID, and platform are required',
      });
    }

    let user;

    if (req.userType === 'User') {
      user = await User.findById(userId);
    }

    if (req.userType === 'Vendor') {
      user = await Vendor.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.fcmToken = {
      token: fcmToken,
      deviceId,
      platform,
      deviceName,
      isActive: true,
      updatedAt: new Date(),
    };

    await user.save();

    return res.json({
      success: true,
      message: 'FCM token registered successfully',
    });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register FCM token',
    });
  }
};

const removeFcmToken = async (req, res) => {
  try {
    const { fcmToken, deviceId } = req.body;
    const userId = req.user._id;

    if (!fcmToken && !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Either FCM token or Device ID is required',
      });
    }

    let user;

    if (req.userType === 'User') {
      user = await User.findById(userId);
    }

    if (req.userType === 'Vendor') {
      user = await Vendor.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Match based on either fcmToken or deviceId
    if (user.fcmToken && (user.fcmToken.token === fcmToken || user.fcmToken.deviceId === deviceId)) {
      user.fcmToken = null; // clear FCM token object
      await user.save();
    } else {
      return res.status(404).json({
        success: false,
        message: 'No matching FCM token found',
      });
    }

    return res.json({
      success: true,
      message: 'FCM token removed successfully',
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove FCM token',
    });
  }
};

export { registerFcmToken, removeFcmToken };
