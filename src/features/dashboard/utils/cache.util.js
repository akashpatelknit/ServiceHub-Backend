import redisClient from '../../../config/redis.js';
import { logger } from '../../../utils/index.js';

const buildKey = (routeKey, query) => `dashboard:${routeKey}:${JSON.stringify(query)}`;

// Aggregation results only — a Redis outage should degrade to always-live queries,
// never take the dashboard down, so both the read and the write are best-effort.
export const withCache = async (routeKey, query, ttlSeconds, compute) => {
  const key = buildKey(routeKey, query);

  try {
    const cached = await redisClient.get(key);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn('Dashboard cache read failed', { key, message: err.message });
  }

  const result = await compute();

  try {
    await redisClient.set(key, JSON.stringify(result), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn('Dashboard cache write failed', { key, message: err.message });
  }

  return result;
};
