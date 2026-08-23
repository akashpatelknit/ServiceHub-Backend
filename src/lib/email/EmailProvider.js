// Interface every email backend must implement — same shape as PaymentProvider/
// ShippingProvider (features/payment, features/product-order). Callers use this
// interface only, never an email SDK directly, so swapping providers later means a new
// adapter, not a rewrite of every place that sends mail.
export class EmailProvider {
  async send(_message) {
    throw new Error('send() not implemented');
  }
}
