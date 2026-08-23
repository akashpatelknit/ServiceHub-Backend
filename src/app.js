// server.js
import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import * as Sentry from '@sentry/node';
import router from './routes/v1/index.js';
import { corsConfig } from './config/cors.js';
import { initializeSocket } from './sockets/socket.config.js';
import httpResponse from './utils/httpResponse.js';
import quicker from './utils/quicker.js';
import globalErrorHandler from './utils/globalErrorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import './config/instrument.mjs';
import { swaggerSpec, swaggerUi } from './config/swagger.js';
import { paymentWebhookRoutes } from './features/payment/index.js';
import { productOrderWebhookRoutes } from './features/product-order/index.js';
import { authenticate } from './features/auth/middlewares/authenticate.js';
import { checkPermission } from './features/auth/middlewares/checkPermission.js';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from './features/auth/constants/permissions.constants.js';
import { bullBoardRouter, BULL_BOARD_BASE_PATH } from './lib/queue/board.js';

const app = express();
const server = http.createServer(app);

initializeSocket(server);

Sentry.setupExpressErrorHandler(app);

app.use(function onError(err, req, res, next) {
  res.statusCode = 500;
  res.end(res.sentry + '\n');
});

app.use(cors(corsConfig));

// Webhook signature verification needs the exact raw request bytes, so these two
// routes are mounted ahead of the global express.json() below — once that parser
// runs it consumes/re-serializes the body and the original bytes are gone.
app.use('/api/webhooks/razorpay', express.raw({ type: 'application/json' }), paymentWebhookRoutes);
app.use('/api/webhooks/shiprocket', express.raw({ type: 'application/json' }), productOrderWebhookRoutes);

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
  const url = 'https://servicehub-backend-ca08.onrender.com';
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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Bull Board (job-queue dashboard) — same "non-versioned admin tooling mounted
// directly on app" pattern as /api-docs above. Gated behind SUPER_ADMIN-only
// checkPermission (see QUEUES in permissions.constants.js), matching every other
// admin.routes.js in the app rather than a bare identity check.
app.use(
  BULL_BOARD_BASE_PATH,
  authenticate,
  checkPermission(PERMISSION_RESOURCES.QUEUES, PERMISSION_ACTIONS.READ),
  bullBoardRouter
);

app.use('/api', router);

// Global Error Handler
app.use(Sentry.expressErrorHandler());

app.use(globalErrorHandler);

export { app, server };
