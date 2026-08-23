import { renderLayout } from './layout.js';
import { VENDOR_SERVICE_STATUS, VENDOR_SERVICE_TARGET_TYPE } from '../../../features/service-catalog/constants/catalog.constants.js';

export const vendorServiceReviewedTemplate = ({ vendorName, serviceName, targetType, status, rejectionReason }) => {
  const approved = status === VENDOR_SERVICE_STATUS.APPROVED;
  const heading = approved ? 'Service Request Approved' : 'Service Request Rejected';
  const accentColor = approved ? '#16a34a' : '#dc2626';
  // Category approval covers every subcategory/service under it — worth spelling out
  // since it's broader than what the vendor named in their request.
  const scopeNote =
    targetType === VENDOR_SERVICE_TARGET_TYPE.CATEGORY
      ? ` This covers all services under the ${serviceName} category.`
      : '';

  const bodyHtml = approved
    ? `
      <p>Hi ${vendorName || 'there'},</p>
      <p>Your request to offer <strong>${serviceName}</strong> has been approved. You're now eligible to receive jobs for this.${scopeNote}</p>
    `
    : `
      <p>Hi ${vendorName || 'there'},</p>
      <p>Your request to offer <strong>${serviceName}</strong> was not approved.</p>
      ${rejectionReason ? `<p style="color:#6b7280;">Reason: ${rejectionReason}</p>` : ''}
      <p>You can submit a new request from the Service Hub vendor app.</p>
    `;

  return {
    subject: approved ? `Your request to offer ${serviceName} was approved` : `Your request to offer ${serviceName} was rejected`,
    html: renderLayout({ heading, bodyHtml, accentColor }),
    text: approved
      ? `Your request to offer ${serviceName} was approved.${scopeNote}`
      : `Your request to offer ${serviceName} was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
  };
};
