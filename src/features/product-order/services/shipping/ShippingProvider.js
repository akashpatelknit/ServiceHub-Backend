// Interface every shipping carrier adapter must implement. Order logic calls this
// interface only, never a carrier's API directly — adding a second carrier later
// means a new adapter class, not a rewrite of order/webhook logic.
export class ShippingProvider {
  async createShipment(_productOrder) {
    throw new Error('createShipment() not implemented');
  }

  async trackShipment(_trackingId) {
    throw new Error('trackShipment() not implemented');
  }

  async cancelShipment(_trackingId) {
    throw new Error('cancelShipment() not implemented');
  }

  verifyWebhookSignature(_rawBody, _signature) {
    throw new Error('verifyWebhookSignature() not implemented');
  }
}
