import { emailProvider } from '../../lib/email/index.js';
import { orderConfirmationTemplate } from '../../lib/email/templates/orderConfirmation.template.js';
import { passwordResetTemplate } from '../../lib/email/templates/passwordReset.template.js';
import { vendorAssignmentTemplate } from '../../lib/email/templates/vendorAssignment.template.js';
import { vendorServiceReviewedTemplate } from '../../lib/email/templates/vendorServiceReviewed.template.js';
import { ServiceOrder } from '../../features/service-booking/models/serviceOrder.model.js';
import { logger } from '../../utils/index.js';

const TEMPLATES = {
  confirmation: orderConfirmationTemplate,
  passwordReset: passwordResetTemplate,
  vendorAssignment: vendorAssignmentTemplate,
  vendorServiceReviewed: vendorServiceReviewedTemplate,
};

// Only 'confirmation' jobs carry `serviceOrderNumbers` (populated by the producer
// alongside `templateData` — see paymentEventHandlers.js) — the field this idempotency
// check gates on. It's a sibling of templateData rather than part of it so the
// template-rendering call below can keep passing templateData straight through
// unmodified, matching orderConfirmationTemplate's existing input shape exactly.
async function alreadySentConfirmation(serviceOrderNumbers) {
  if (!serviceOrderNumbers?.length) return false;

  const orders = await ServiceOrder.find({ orderNumber: { $in: serviceOrderNumbers } }).select('confirmationEmailSentAt');
  return orders.length > 0 && orders.every((order) => order.confirmationEmailSentAt);
}

async function markConfirmationSent(serviceOrderNumbers) {
  if (!serviceOrderNumbers?.length) return;
  await ServiceOrder.updateMany({ orderNumber: { $in: serviceOrderNumbers } }, { $set: { confirmationEmailSentAt: new Date() } });
}

export async function emailProcessor(job) {
  const { to, template, templateData, serviceOrderNumbers } = job.data;

  const renderTemplate = TEMPLATES[template];
  if (!renderTemplate) {
    throw new Error(`Unknown email template "${template}"`);
  }

  if (template === 'confirmation' && (await alreadySentConfirmation(serviceOrderNumbers))) {
    logger.info('Confirmation email already sent — skipping', { jobId: job.id, serviceOrderNumbers });
    return { skipped: true, reason: 'already-sent' };
  }

  const { subject, html, text } = renderTemplate(templateData);
  const result = await emailProvider.send({ to, subject, html, text });

  if (!result.success) {
    // Throw so BullMQ retries with backoff — transient Resend failures (rate limit,
    // network blip) are exactly what the queue's retry policy exists to absorb.
    throw new Error(`Email send failed: ${result.reason}`);
  }

  if (template === 'confirmation') {
    await markConfirmationSent(serviceOrderNumbers);
  }

  return { messageId: result.messageId };
}
