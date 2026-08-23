import { Resend } from 'resend';
import config from '../../config/config.js';
import { logger } from '../../utils/index.js';
import { EmailProvider } from './EmailProvider.js';

// Resend's free tier only allows sending from their shared `onboarding@resend.dev`
// domain, or from a domain you've verified via DNS. Sending from an unverified custom
// domain fails at send time — FROM_EMAIL defaults to the shared domain so dev/testing
// works out of the box, but production needs a real, DNS-verified FROM_EMAIL.
const FALLBACK_FROM_EMAIL = 'onboarding@resend.dev';

export class ResendProvider extends EmailProvider {
  constructor() {
    super();
    this.fromEmail = config.FROM_EMAIL || FALLBACK_FROM_EMAIL;

    if (!config.RESEND_API_KEY) {
      logger.warn(
        'RESEND_API_KEY is not set — email sending is disabled. Set RESEND_API_KEY (and FROM_EMAIL) in .env to enable it.'
      );
      this.client = null;
      return;
    }

    if (!config.FROM_EMAIL) {
      logger.warn(
        `FROM_EMAIL is not set — falling back to Resend's shared "${FALLBACK_FROM_EMAIL}" domain. ` +
          'This works for testing only; production sending needs a DNS-verified domain of your own.'
      );
    }

    this.client = new Resend(config.RESEND_API_KEY);
  }

  // Never throws — a failed/disabled email send returns { success: false, reason }
  // so callers can log it without letting mail delivery break the operation it's
  // attached to (password reset, vendor assignment, order confirmation).
  async send({ to, subject, html, text }) {
    if (!this.client) {
      return { success: false, reason: 'email-provider-not-configured' };
    }

    // Resend's free tier (no verified domain) only delivers to the email address the
    // Resend account itself is registered under — every other recipient bounces with
    // a 403. Outside production, redirect there instead so the full queue → email
    // flow can be exercised end-to-end without a real domain. Once FROM_EMAIL points
    // at a verified domain in production, this never applies.
    let recipient = to;
    if (config.NODE_ENV !== 'production' && config.RESEND_SANDBOX_REDIRECT_EMAIL) {
      recipient = config.RESEND_SANDBOX_REDIRECT_EMAIL;
      logger.info('Resend sandbox mode — redirecting email', { originalTo: to, redirectedTo: recipient, subject });
    }

    try {
      const { data, error } = await this.client.emails.send({
        from: `Service Hub <${this.fromEmail}>`,
        to: recipient,
        subject,
        html,
        text,
      });

      if (error) {
        logger.error('Resend email send failed', { to, subject, error: error.message || error });
        return { success: false, reason: 'send-failed' };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      logger.error('Resend email send threw unexpectedly', { to, subject, error: error.message });
      return { success: false, reason: 'send-failed' };
    }
  }
}
