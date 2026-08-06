// Interface every payment gateway adapter must implement. Order/checkout logic calls
// this interface only, never a gateway SDK directly — adding a second gateway later
// means a new adapter class, not a rewrite of checkout/webhook logic.
export class PaymentProvider {
  async createOrder(_params) {
    throw new Error('createOrder() not implemented');
  }

  verifyWebhookSignature(_rawBody, _signature) {
    throw new Error('verifyWebhookSignature() not implemented');
  }

  verifyPaymentSignature(_gatewayOrderId, _gatewayPaymentId, _signature) {
    throw new Error('verifyPaymentSignature() not implemented');
  }

  async fetchPayment(_gatewayPaymentId) {
    throw new Error('fetchPayment() not implemented');
  }

  async refund(_gatewayPaymentId, _amount) {
    throw new Error('refund() not implemented');
  }
}
