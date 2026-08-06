import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';

// The raw-body parsing (express.raw) is applied at the app.js mount point for this
// router, before the global express.json() middleware — not here — since it has to
// run ahead of any other body parser touching the request.
const router = Router();

router.post('/', WebhookController.razorpay);

export default router;
