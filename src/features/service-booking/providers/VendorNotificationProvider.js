// Interface every vendor-notification channel must implement — same shape as
// PaymentProvider/ShippingProvider (features/payment, features/product-order). Assignment
// logic calls this interface only, never a channel SDK directly, so adding a push-notification
// channel later (once a vendor app exists) means a new adapter, not a rewrite of assign logic.
export class VendorNotificationProvider {
  // Returns { sent: boolean, reason?: string } — never throws, so a notification
  // failure can't roll back an assignment that already succeeded.
  async notifyAssignment(_vendor, _jobInfo) {
    throw new Error('notifyAssignment() not implemented');
  }
}
