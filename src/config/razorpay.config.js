import Razorpay from 'razorpay';
import config from './config.js';

// Fail fast at boot rather than at the first checkout/webhook call — the SDK
// itself doesn't validate these, it just signs requests with `undefined` and lets
// Razorpay reject them with an opaque 401 far from this file.
const REQUIRED_VARS = ['RAZORPAY_KEY_ID', 'RAZORPAY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'];
const missing = REQUIRED_VARS.filter((key) => !config[key]);
if (missing.length > 0) {
  throw new Error(`Missing required Razorpay config: ${missing.join(', ')}. Set these in your .env file.`);
}

const razorpay = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_SECRET,
});

export default razorpay;
