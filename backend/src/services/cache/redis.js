import Redis from 'ioredis';
import logger from '../../logger.js';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<string|null>} - Cached value or null
 */
export async function cacheGet(key) {
  try {
    const value = await redis.get(key);
    if (value) {
      logger.debug('Cache hit:', { key });
      return value;
    }
    logger.debug('Cache miss:', { key });
    return null;
  } catch (error) {
    logger.error('Redis get error:', { error, key });
    return null;
  }
}

/**
 * Set a value in cache
 * @param {string} key - Cache key
 * @param {string} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>} - Success status
 */
export async function cacheSet(key, value, ttl) {
  try {
    if (ttl) {
      await redis.set(key, value, 'EX', ttl);
    } else {
      await redis.set(key, value);
    }
    logger.debug('Cache set:', { key, ttl });
    return true;
  } catch (error) {
    logger.error('Redis set error:', { error, key });
    return false;
  }
}

/**
 * Clear cache by pattern
 * @param {string} pattern - Key pattern to clear
 * @returns {Promise<number>} - Number of keys cleared
 */
export async function cacheClear(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info('Cache cleared:', { pattern, count: keys.length });
    }
    return keys.length;
  } catch (error) {
    logger.error('Redis clear error:', { error, pattern });
    return 0;
  }
}

export default {
  cacheGet,
  cacheSet,
  cacheClear,
  redis
}; 