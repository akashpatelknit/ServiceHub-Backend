// server.js
import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import * as Sentry from '@sentry/node';
import routes from './routes/v1/index.js';
import { corsConfig } from './config/cors.js';
import { initializeSocket } from './sockets/socket.config.js';
import httpResponse from './utils/httpResponse.js';
import quicker from './utils/quicker.js';
import { imageKitAuthenticate } from './config/imagekit.js';
import router from './routes/v1/index.js';
import globalErrorHandler from './utils/globalErrorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { bookingNotificationService } from './services/booking/booking.notification.service.js';
import './config/instrument.mjs';
import { uploadExcel } from './middlewares/multer.middleware.js';
import { addonsUpload } from './controllers/excel-upload/excelUpload.controller.js';

const app = express();
const server = http.createServer(app);

initializeSocket(server);

Sentry.setupExpressErrorHandler(app);

app.use(function onError(err, req, res, next) {
  res.statusCode = 500;
  res.end(res.sentry + '\n');
});

app.use(cors(corsConfig));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());
app.use(requestLogger);

app.get('/', (req, res) => {
  httpResponse(res, 200, 'Welcome to the API', {
    systemHealth: quicker.getSystemHealth(),
    applicationHealth: quicker.getApplicationHealth(),
  });
});

app.get('/health', (req, res) => res.status(200).send('OK'));

// Keep-alive ping for Render
function keepAlive() {
  const url = 'https://ao1.onrender.com';
  setInterval(
    async () => {
      try {
        console.log('Pinging self to stay alive...');
        const response = await axios.get(url);
        console.log(`Self-ping successful: ${response.status}`);
      } catch (error) {
        console.error('Self-ping failed:', error.message);
      }
    },
    3 * 60 * 1000
  );
}

if (process.env.NODE_ENV === 'development') {
  setTimeout(keepAlive, 2 * 60 * 1000); // start after 2 minutes
}

// API Routes
app.get('/debug-sentry', function mainHandler(req, res) {
  throw new Error('My first Sentry error!');
});

// app.use('/api/v1/user', routes.USER_AUTH_ROUTES);
// app.use('/api/v1/vendor', routes.VENDOR_AUTH_ROUTES);
// app.use('/api/v1/admin', routes.ADMIN_ROUTES);
// app.use('/api/v1/options', routes.OPTIONS_ROUTE);
// app.use('/api/v1/admin-auth', routes.ADMIN_AUTH_ROUTES);
// // app.use('/api/v1/services', routes.SERVICE_ROUTES);
// app.use('/api/v1/wallets', routes.WALLET_ROUTES);
// app.use('/api/v1/bank-account', routes.BANK_ACCOUNT_ROUTES);
// app.use('/api/v1/users', routes.CUSTOMER_ROUTES);
// app.use('/api/v1/bookings', routes.BOOKING_ROUTES);
// app.use('/api/v1/google', routes.GOOGLE_ROUTES);
// app.use('/api/v1/otp', routes.OTP_ROUTES);
// app.use('/api/v1/banner', routes.BANNER_ROUTES);
// app.use('/api/v1/settings', routes.SETTING_ROUTES);
// app.use('/api/v1/settings', routes.SETTING_ROUTES);
// app.use('/api/v1/withdrawal', routes.WITHDRAWAL_REQUEST_ROUTES);
// app.use('/api/v1/excel-upload', routes.EXCEL_UPLOAD_ROUTES);
// app.use('/api/v1/calculator', routes.CALCULATOR_ROUTES);
// app.use('/api/v1', routes.NOTIFICATION_ROUTES);
// app.use('/api/v1', routes.VENDOR_ROUTES);
// app.use('/api/v1', routes.PAYMENT_ROUTES);
// app.use('/api/v1', routes.PRODUCT_ROUTES);
// app.use('/api/v1', routes.SERVICE_ROUTES1);
// app.use('/api/v1', routes.CATEGORY_ROUTES);
// app.use('/api/v1', routes.RATING_ROUTES);
// app.use('/api/v1', routes.CUSTOMER_ROUTES);
// app.use('/api/v1', routes.COUPON_ROUTES);
// app.use('/api/v1', routes.COMMON_ROUTES);
// app.get('/api/v1/imagekit-auth', imageKitAuthenticate);
// app.use('/api/v1/images', routes.IMAGE_UPLOAD_ROUTES);
// app.use('/api/v1', routes.FCM_TOKEN_ROUTES);
// app.use('/api/v1/reports', routes.USER_REPORTS_ROUTES);
// app.use('/api/v1', routes.KPIS_ROUTES);
// app.use('/api/v1', routes.TESTING_ROUTES);

// app.post('/api/v1/test-booking-payment', async (req, res) => {
//   await bookingNotificationService.sendBookingConformationNotificationToVendorTesting(req.body.token);
//   return res.status(200).json({ success: true });
// });

app.use('/api/v1', router);

// Global Error Handler
app.use(Sentry.expressErrorHandler());

app.use(globalErrorHandler);

export { app, server };
