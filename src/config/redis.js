import Redis from 'ioredis';
import config from './config.js';
import { logger } from '../utils/logger.js';

const redisClient = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
});

redisClient.on('connect', () => logger.info('✅ Redis connected'));
redisClient.on('error', (err) => logger.error('Redis connection error', { message: err.message }));

export default redisClient;
