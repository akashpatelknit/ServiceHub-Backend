import { Worker } from 'bullmq';
import { connection } from './connection.js';
import { logger } from '../../utils/index.js';

// Shared BullMQ Worker construction + lifecycle logging — used by both worker.js
// (email/invoice/reminder) and server.js (notification, which needs to run in the
// API process specifically — see server.js for why).
export function createQueueWorker(queueName, processor, { concurrency } = {}) {
  const worker = new Worker(queueName, processor, { connection, concurrency });

  worker.on('completed', (job) => {
    logger.info('Job completed', { queue: queueName, jobId: job.id, jobName: job.name });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', {
      queue: queueName,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      error: err.message,
    });
  });

  worker.on('stalled', (jobId) => {
    logger.warn('Job stalled', { queue: queueName, jobId });
  });

  worker.on('error', (err) => {
    logger.error('Worker error', { queue: queueName, error: err.message });
  });

  return worker;
}
