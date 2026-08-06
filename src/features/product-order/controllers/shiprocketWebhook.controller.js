import { StatusCodes } from 'http-status-codes';
import { ApiError, asyncHandler } from '../../../utils/index.js';
import { ProductOrderService } from '../services/productOrder.service.js';
import { ShiprocketAdapter } from '../services/shipping/ShiprocketAdapter.js';

const shippingProvider = new ShiprocketAdapter();

export const ShiprocketWebhookController = {
  // req.body is the raw Buffer here (see routes/webhook.routes.js + app.js mount).
  // Payload field names (awb/current_status/order_id) are a best-effort guess pending
  // real Shiprocket docs — see SHIPROCKET_STATUS_MAP for the same caveat.
  handle: asyncHandler(async (req, res) => {
    const signature = req.headers['x-api-key'] || req.headers['x-shiprocket-signature'];
    if (!shippingProvider.verifyWebhookSignature(req.body, signature)) {
      throw new ApiError(400, 'Invalid webhook signature');
    }

    const body = JSON.parse(req.body.toString('utf8'));
    const trackingId = body.awb || body.tracking_id;
    const rawStatus = body.current_status || body.status;
    if (!trackingId || !rawStatus) {
      throw new ApiError(400, 'Malformed webhook payload');
    }

    await ProductOrderService.handleShipmentStatusUpdate({ trackingId, rawStatus });
    return res.status(StatusCodes.OK).json({ success: true });
  }),
};
