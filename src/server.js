// Canonical HTTP/API entry point — boots the Express app only. The worker process
// (src/worker.js) is a fully separate entry point handling email/invoice/reminder;
// this file must never import it. src/index.js re-exports this file unchanged so
// existing deploy configs pointing at src/index.js (vercel.json, package.json's
// "main") keep working.
//
// One exception: the `notification` queue IS processed here, not in worker.js.
// AdminEvents.emitNewBooking needs a live Socket.IO server with actual connected
// admin browser clients — that only exists in this process (app.js calls
// initializeSocket() at import time, before this file's code below runs), so this
// queue can't be handed off to the separate worker process the way the other three are.
import connectDB from './db/index.js';
import { server } from './app.js';
import config from './config/config.js';
import { bookingExpirationScheduler } from './services/booking/bookingExpirationScheduler.service.js';
import { QUEUE_NAMES } from './lib/queue/queueNames.constants.js';
import { createQueueWorker } from './lib/queue/createQueueWorker.js';
import { notificationProcessor } from './jobs/notification/notification.processor.js';
import { logger } from './utils/index.js';

connectDB()
  .then(() => {
    server.listen(config.PORT || 8000, () => {
      console.log(`⚙️ Server is running at port : ${config.PORT}`);
      bookingExpirationScheduler.start();
    });

    const notificationWorker = createQueueWorker(QUEUE_NAMES.NOTIFICATION, notificationProcessor, { concurrency: 5 });

    let shuttingDown = false;
    const shutdown = async (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      logger.info(`${signal} received — closing notification worker gracefully`);
      await notificationWorker.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    console.log('MONGO db connection failed !!! ', err);
  });
