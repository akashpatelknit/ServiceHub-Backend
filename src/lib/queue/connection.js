import Redis from 'ioredis';
import { logger } from '../../utils/logger.js';

// Dedicated connection for BullMQ — kept separate from src/config/redis.js (used for
// the auth token blacklist) because BullMQ's blocking commands (used internally by
// Workers) require maxRetriesPerRequest: null, which is incompatible with that
// client's maxRetriesPerRequest: 3.
//
// REDIS_URL is read directly from process.env rather than through config.js, whose
// REDIS_URL falls back to 'redis://localhost:6379' when unset — that fallback would
// silently defeat the fail-fast startup check both server.js and worker.js rely on.
const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error(
    'REDIS_URL is not set. BullMQ requires Redis — every outbound email and background job ' +
      '(invoices, notifications, reminders) depends on it. Set REDIS_URL in your environment before starting.'
  );
}

export const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

connection.on('connect', () => logger.info('✅ BullMQ Redis connection established'));
connection.on('error', (err) => logger.error('BullMQ Redis connection error', { message: err.message }));
