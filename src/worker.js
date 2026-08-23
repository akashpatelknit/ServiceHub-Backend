// Independent entry point for the background-job process — never imported by server.js
// and never imports app.js/index.js. Shares only lib/queue/connection.js + queues.js
// with the API process. Run alongside `npm run dev`/`npm start`, not instead of it —
// the API enqueues jobs here but does not process them itself.
//
// QUEUE_NAMES.NOTIFICATION is deliberately NOT processed here. Its job
// (AdminEvents.emitNewBooking → Socket.IO) needs a live Socket.IO server with
// actual connected admin browser clients, which only exist in the API process —
// this process has neither. That queue is processed by server.js instead.
import connectDB from './db/index.js';
import { connection } from './lib/queue/connection.js';
import { QUEUE_NAMES } from './lib/queue/queueNames.constants.js';
import { createQueueWorker } from './lib/queue/createQueueWorker.js';
import { emailProcessor } from './jobs/email/email.processor.js';
import { invoiceProcessor } from './jobs/invoice/invoice.processor.js';
import { reminderProcessor } from './jobs/reminder/reminder.processor.js';
import { logger } from './utils/index.js';

// Per-queue concurrency — named and tunable in one place. Invoice generation is
// CPU-bound (PDF rendering) so it gets a lower ceiling than the I/O-bound email/
// reminder jobs.
const CONCURRENCY = {
  [QUEUE_NAMES.EMAIL]: 5,
  [QUEUE_NAMES.INVOICE]: 2,
  [QUEUE_NAMES.REMINDER]: 5,
};

const PROCESSORS = {
  [QUEUE_NAMES.EMAIL]: emailProcessor,
  [QUEUE_NAMES.INVOICE]: invoiceProcessor,
  [QUEUE_NAMES.REMINDER]: reminderProcessor,
};

async function start() {
  await connectDB();

  const queueNames = Object.keys(PROCESSORS);
  const workers = queueNames.map((queueName) =>
    createQueueWorker(queueName, PROCESSORS[queueName], { concurrency: CONCURRENCY[queueName] })
  );

  logger.info(`⚙️  Worker process started — listening on queues: ${queueNames.join(', ')}`);

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received — closing workers gracefully (in-flight jobs are allowed to finish)`);

    // Worker#close() waits for jobs currently being processed to complete before
    // resolving, rather than killing them mid-execution.
    await Promise.all(workers.map((worker) => worker.close()));
    await connection.quit();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error('Worker process failed to start', { error: err.message });
  process.exit(1);
});
