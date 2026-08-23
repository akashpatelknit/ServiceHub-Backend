import { SMSService } from '../../../services/sms/smsService.js';
import config from '../../../config/config.js';
import { logger } from '../../../utils/index.js';
import { VendorNotificationProvider } from './VendorNotificationProvider.js';

const isSmsConfigured = () =>
  Boolean(config.SMS_BASE_URL && config.SMS_USER && config.SMS_PASSWORD && config.SMS_SENDER_ID);

// No vendor app exists yet (see task context), so SMS is the only implemented channel —
// email is left as a future adapter behind the same VendorNotificationProvider interface
// rather than built now with no configured SMTP credentials to back it.
export class SmsVendorNotificationAdapter extends VendorNotificationProvider {
  constructor() {
    super();
    this.smsService = new SMSService();
  }

  async notifyAssignment(vendor, jobInfo) {
    if (!isSmsConfigured()) {
      logger.warn('Vendor assignment SMS not sent: SMS provider credentials are not configured', {
        vendorId: vendor._id,
      });
      return { sent: false, reason: 'sms-provider-not-configured' };
    }

    const message = `New job assigned: ${jobInfo.serviceNames} on ${jobInfo.scheduledDateLabel} (${jobInfo.scheduledSlot}) near ${jobInfo.areaLabel}. Check the vendor admin panel for details.`;

    try {
      await this.smsService.sendSMS(vendor.phoneNumber, message);
      return { sent: true };
    } catch (error) {
      logger.error('Vendor assignment SMS failed to send', { vendorId: vendor._id, error: error.message });
      return { sent: false, reason: 'send-failed' };
    }
  }
}
