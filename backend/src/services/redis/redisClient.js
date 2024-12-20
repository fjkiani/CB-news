import Redis from 'ioredis';
import logger from '../../logger.js';

let redisClient = null;

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      tls: {
        rejectUnauthorized: false
      },
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
      connectTimeout: 10000,
      keepAlive: 10000
    });
    
    redisClient.on('error', (error) => {
      logger.error('Redis Client Error:', error);
      // Don't throw the error, just log it
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis Client Reconnecting');
    });

    redisClient.on('ready', () => {
      logger.info('Redis Client Ready');
    });
  }
  return redisClient;
}

export async function cleanup() {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed successfully');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
}
