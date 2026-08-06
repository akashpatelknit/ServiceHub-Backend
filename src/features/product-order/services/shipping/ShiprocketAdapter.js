import { ShippingProvider } from './ShippingProvider.js';

// STUB — no Shiprocket credentials or API docs were available at implementation
// time (grep across this codebase for "shiprocket" turned up nothing pre-existing
// either). Every method below is a placeholder returning deterministic fake data
// instead of calling Shiprocket's real API — it does NOT silently no-op; it logs
// loudly so this is impossible to miss in server output.
//
// To go live: implement real HTTP calls here (Shiprocket auth token flow, order/
// shipment creation, tracking, cancellation, webhook HMAC verification) once
// credentials (e.g. SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD / SHIPROCKET_WEBHOOK_SECRET)
// are added to src/config/config.js. The ShippingProvider interface and every call
// site in product-order already treat this as a black box, so this is the only file
// that needs to change.
export class ShiprocketAdapter extends ShippingProvider {
  async createShipment(productOrder) {
    console.warn('[ShiprocketAdapter] STUB createShipment — no real Shiprocket API call was made', {
      orderNumber: productOrder.orderNumber,
    });
    return {
      trackingId: `STUB-${productOrder.orderNumber}`,
      awbNumber: null,
      courierName: null,
    };
  }

  async trackShipment(trackingId) {
    console.warn('[ShiprocketAdapter] STUB trackShipment — no real Shiprocket API call was made', { trackingId });
    return 'pending';
  }

  async cancelShipment(trackingId) {
    console.warn('[ShiprocketAdapter] STUB cancelShipment — no real Shiprocket API call was made', { trackingId });
    return true;
  }

  verifyWebhookSignature(_rawBody, _signature) {
    console.warn('[ShiprocketAdapter] STUB verifyWebhookSignature — always returns true until real credentials are wired in');
    return true;
  }
}
