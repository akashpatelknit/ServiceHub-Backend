import { renderLayout, button } from './layout.js';

export const passwordResetTemplate = ({ resetUrl, expiryMinutes = 15 }) => {
  const bodyHtml = `
    <p>Hi there,</p>
    <p>We received a request to reset your Service Hub password.</p>
    ${button(resetUrl, 'Reset Password', '#EF4444')}
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break:break-all; color:#EF4444;">${resetUrl}</p>
    <p style="margin-top:24px; padding:12px 16px; background-color:#FEF3C7; border-left:4px solid #F59E0B; border-radius:4px;">
      This link expires in ${expiryMinutes} minutes. If you didn't request this, you can safely ignore this email.
    </p>
  `;

  return {
    subject: 'Reset your Service Hub password',
    html: renderLayout({ heading: 'Password Reset Request', bodyHtml, accentColor: '#EF4444' }),
    text: `We received a request to reset your Service Hub password. Reset it here (expires in ${expiryMinutes} minutes): ${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  };
};
