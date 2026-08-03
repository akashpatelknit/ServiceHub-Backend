import redisClient from '../../../config/redis.js';

const keyFor = (jti) => `auth:blacklist:${jti}`;

export const BlacklistService = {
  async add(jti, ttlSeconds) {
    if (!jti || !ttlSeconds || ttlSeconds <= 0) return;
    await redisClient.set(keyFor(jti), '1', 'EX', ttlSeconds);
  },

  async isBlacklisted(jti) {
    if (!jti) return false;
    return (await redisClient.exists(keyFor(jti))) === 1;
  },
};
