import { User, Vendor } from '../../core/models/index.js';
import notificationService from '../../services/firebase-notification/notificationService.js';

const sendNotificationToVendor = async (req, res) => {
  try {
    const { userId, title, body, data, fcmToken } = req.body;

    // const token = await Vendor.findOne({ _id: userId }, { fcmTokens: 1 });

    const token = fcmToken;

    if (!token) {
      return res.status(404).json({ error: 'User token not found' });
    }

    const result = await notificationService.sendToDevice(token, title, body, data);

    if (result.success) {
      res.json({ message: 'Notification sent successfully', result });
    } else {
      res.status(500).json({ error: 'Failed to send notification', result });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendNotificationToMultipleVendors = async (req, res) => {
  try {
    const { userIds, title, body, data } = req.body;

    const tokens = await Vendor.find({ _id: { $in: userIds } }, { fcmTokens: 1 });

    if (!tokens || tokens.length === 0) {
      return res.status(404).json({ error: 'No user tokens found' });
    }

    const tokenArray = tokens.map((token) => token.fcmTokens).flat();

    const result = await notificationService.sendToMultipleDevices(tokenArray, title, body, data);

    if (result.success) {
      res.json({ message: 'Notifications sent successfully', result });
    } else {
      res.status(500).json({ error: 'Failed to send notifications', result });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendNotificationToUser = async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    const token = await User.findOne({ _id: userId }, { fcmTokens: 1 });

    if (!token) {
      return res.status(404).json({ error: 'User token not found' });
    }

    const result = await notificationService.sendToDevice(token.fcmTokens, title, body, data);

    if (result.success) {
      res.json({ message: 'Notification sent successfully', result });
    } else {
      res.status(500).json({ error: 'Failed to send notification', result });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export { sendNotificationToVendor, sendNotificationToMultipleVendors, sendNotificationToUser };
