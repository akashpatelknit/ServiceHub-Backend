import { emailService } from '../../../services/email/email.service.js';

/**
 * Adapter interface auth code sends mail through — swap the implementation (SendGrid/SES/
 * Resend) here without touching auth logic. Currently backed by the existing
 * nodemailer-based EmailService (SMTP_* env vars).
 */
export const EmailProvider = {
  async send(to, subject, body) {
    return emailService.sendRaw({ to, subject, html: body });
  },
};
