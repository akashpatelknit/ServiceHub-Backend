import { Queue } from 'bullmq';
import { connection } from './connection.js';
import { QUEUE_NAMES } from './queueNames.constants.js';

export const queues = {
  email: new Queue(QUEUE_NAMES.EMAIL, {
    connection,
    defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
  }),
  invoice: new Queue(QUEUE_NAMES.INVOICE, {
    connection,
    defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
  }),
  notification: new Queue(QUEUE_NAMES.NOTIFICATION, {
    connection,
    defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 1000 } },
  }),
  reminder: new Queue(QUEUE_NAMES.REMINDER, {
    connection,
    defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 5000 } },
  }),
};
