// Shared table-based shell so all three templates render consistently across email
// clients (table layout, inline styles — no flexbox/grid, no external stylesheet).
export const renderLayout = ({ heading, bodyHtml, accentColor = '#4F46E5' }) => `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; max-width:600px; width:100%;">
            <tr>
              <td style="background-color:${accentColor}; padding:24px 32px;">
                <span style="color:#ffffff; font-size:20px; font-weight:bold;">Service Hub</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px; font-size:20px; color:#111827;">${heading}</h1>
                <div style="font-size:15px; line-height:1.6; color:#374151;">
                  ${bodyHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; background-color:#f9fafb; text-align:center;">
                <span style="font-size:12px; color:#9ca3af;">&copy; ${new Date().getFullYear()} Service Hub. All rights reserved.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const button = (url, label, accentColor = '#4F46E5') => `
  <p style="text-align:center; margin:28px 0;">
    <a href="${url}" style="display:inline-block; padding:12px 28px; background-color:${accentColor}; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">${label}</a>
  </p>
`;
