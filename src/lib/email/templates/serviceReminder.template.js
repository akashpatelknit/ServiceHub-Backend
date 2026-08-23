import { renderLayout } from './layout.js';

// No reminder template existed before this queue work — booking-confirmation and
// vendor-assignment mail were the only transactional sends until now. Built to match
// the other three templates' shape/style exactly (renderLayout + subject/html/text).
export const serviceReminderTemplate = ({ customerName, orderNumber, serviceNames, scheduledDateLabel, scheduledSlot }) => {
  const bodyHtml = `
    <p>Hi ${customerName || 'there'},</p>
    <p>This is a reminder about your upcoming Service Hub booking.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0; border:1px solid #e5e7eb; border-radius:6px;">
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; color:#6b7280; width:40%;">Order</td>
        <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; color:#111827;">${orderNumber}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; color:#6b7280;">Service</td>
        <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; color:#111827;">${serviceNames}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px; color:#6b7280;">Scheduled</td>
        <td style="padding:12px 16px; color:#111827;">${scheduledDateLabel} &middot; ${scheduledSlot}</td>
      </tr>
    </table>
    <p>See you soon!</p>
  `;

  return {
    subject: `Reminder — your service is scheduled soon (${orderNumber})`,
    html: renderLayout({ heading: 'Upcoming Service Reminder', bodyHtml, accentColor: '#0EA5E9' }),
    text: `Reminder: your service (${serviceNames}) is scheduled for ${scheduledDateLabel} ${scheduledSlot}. Order ${orderNumber}.`,
  };
};
