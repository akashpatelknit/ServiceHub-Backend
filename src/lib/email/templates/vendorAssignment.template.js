import { renderLayout } from './layout.js';

// Deliberately no full customer address/contact — only area/pincode — until a vendor
// app with an accept flow exists (see service-booking's assignVendor).
export const vendorAssignmentTemplate = ({ vendorName, orderNumber, serviceNames, scheduledDateLabel, scheduledSlot, areaLabel }) => {
  const bodyHtml = `
    <p>Hi ${vendorName || 'there'},</p>
    <p>You've been assigned a new job on Service Hub.</p>
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
        <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; color:#6b7280;">Scheduled</td>
        <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; color:#111827;">${scheduledDateLabel} &middot; ${scheduledSlot}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px; color:#6b7280;">Area</td>
        <td style="padding:12px 16px; color:#111827;">${areaLabel}</td>
      </tr>
    </table>
    <p>Full customer details are available in the admin panel.</p>
  `;

  return {
    subject: `New job assigned — ${orderNumber}`,
    html: renderLayout({ heading: 'New Job Assigned', bodyHtml }),
    text: `New job assigned: ${serviceNames} on ${scheduledDateLabel} (${scheduledSlot}) near ${areaLabel}. Order ${orderNumber}.`,
  };
};
