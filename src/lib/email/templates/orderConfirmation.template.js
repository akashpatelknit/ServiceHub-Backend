import { renderLayout } from './layout.js';

// `orders` is an array since one checkout/payment can back two order docs (a service
// order and a product order) sharing the same paymentId — see
// order-core/models/customerOrder.model.js.
export const orderConfirmationTemplate = ({ customerName, orders, totalAmount }) => {
  const rows = orders
    .map(
      (order) => `
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; color:#111827;">${order.orderNumber}</td>
        <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; color:#6b7280;">${order.itemsLabel}</td>
        <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; color:#111827; text-align:right;">&#8377;${order.amount.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const bodyHtml = `
    <p>Hi ${customerName || 'there'},</p>
    <p>Thanks for your order — payment has been received and confirmed.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0; border:1px solid #e5e7eb; border-radius:6px; border-collapse:collapse;">
      <tr style="background-color:#f9fafb;">
        <td style="padding:10px 16px; font-size:12px; color:#6b7280; text-transform:uppercase;">Order</td>
        <td style="padding:10px 16px; font-size:12px; color:#6b7280; text-transform:uppercase;">Items</td>
        <td style="padding:10px 16px; font-size:12px; color:#6b7280; text-transform:uppercase; text-align:right;">Amount</td>
      </tr>
      ${rows}
      <tr>
        <td colspan="2" style="padding:12px 16px; font-weight:bold; color:#111827;">Total</td>
        <td style="padding:12px 16px; font-weight:bold; color:#111827; text-align:right;">&#8377;${totalAmount.toFixed(2)}</td>
      </tr>
    </table>
    <p>You can track your order status anytime from your Service Hub account.</p>
  `;

  return {
    subject: `Order confirmed — ${orders.map((o) => o.orderNumber).join(', ')}`,
    html: renderLayout({ heading: 'Order Confirmed', bodyHtml, accentColor: '#16A34A' }),
    text: `Order confirmed: ${orders.map((o) => `${o.orderNumber} (₹${o.amount.toFixed(2)})`).join(', ')}. Total ₹${totalAmount.toFixed(2)}.`,
  };
};
