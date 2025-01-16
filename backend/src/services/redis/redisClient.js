import Redis from 'ioredis';
import logger from '../../logger.js';

// Redis configuration
const redisConfig = process.env.REDIS_URL ? {
  url: process.env.REDIS_URL,
  tls: { rejectUnauthorized: false },
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
} : {
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

let redisClient = null;

export function getRedisClient() {
  if (!redisClient) {
    logger.info('Initializing Redis client with config:', {
      url: redisConfig.url || 'localhost:6379',
      usingTLS: !!redisConfig.tls
    });
    
    redisClient = new Redis(redisConfig);

    redisClient.on('error', (err) => {
      logger.error('Redis error:', {
        message: err.message,
        code: err.code,
        command: err.command
      });
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }
  return redisClient;
}

export async function cleanup() {
  try {
    if (redisClient) {
      logger.info('Closing Redis connection...');
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed successfully');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    throw error;
  }
}
