import { Router } from 'express';
import { ShiprocketWebhookController } from '../controllers/shiprocketWebhook.controller.js';

// The raw-body parsing (express.raw) is applied at the app.js mount point for this
// router, before the global express.json() middleware — not here.
const router = Router();

router.post('/', ShiprocketWebhookController.handle);

export default router;
