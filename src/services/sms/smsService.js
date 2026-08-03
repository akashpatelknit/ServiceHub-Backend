import axios from 'axios';
import config from '../../config/config.js';
import { ApiError } from '../../utils/index.js';

class SMSService {
  constructor() {
    this.smsConfig = {
      baseUrl: config.SMS_BASE_URL,
      user: config.SMS_USER,
      password: config.SMS_PASSWORD,
      senderId: config.SMS_SENDER_ID,
      channel: config.SMS_CHANNEL,
      route: config.SMS_ROUTE,
    };
  }

  async sendSMS(phoneNumber, message) {
    try {
      const params = new URLSearchParams({
        user: this.smsConfig.user,
        password: this.smsConfig.password,
        senderid: this.smsConfig.senderId,
        channel: this.smsConfig.channel,
        DCS: '0',
        flashsms: '0',
        number: phoneNumber,
        text: message,
        route: this.smsConfig.route,
      });

      const response = await axios.get(`${this.smsConfig.baseUrl}?${params}`, {
        headers: {
          'User-Agent': 'ServiceHub-OTP-Service/1.0',
        },
      });

      console.log(`SMS sent to ${phoneNumber}. Response:`, response.data);

      return {
        success: true,
        messageId: response.data.messageId || 'unknown',
        response: response.data,
      };
    } catch (error) {
      console.error('SMS sending failed:', error.message);

      if (error.code === 'ECONNABORTED') {
        throw new ApiError(400, 'SMS service timeout. Please try again.');
      } else if (error.response) {
        throw new ApiError(400, `SMS service error: ${error.response.status} ${error.response.statusText}`);
      } else {
        throw new ApiError(400, 'Failed to send SMS. Please try again later.');
      }
    }
  }
}

export { SMSService };
