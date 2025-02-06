import Redis from 'ioredis';
import logger from '../../logger.js';

// Redis configuration
const redisConfig = process.env.REDIS_URL ? {
  url: process.env.REDIS_URL,
  tls: { rejectUnauthorized: false },
  maxRetriesPerRequest: null, // Disable max retries per request
  enableOfflineQueue: true,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 2000);
    return delay;
  },
  reconnectOnError(err) {
    logger.warn('Redis reconnect triggered:', { error: err.message });
    return true; // Always try to reconnect
  }
} : {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 2000);
    return delay;
  }
};

let redisClient = null;

export function getRedisClient() {
  if (!redisClient) {
    logger.info('Initializing Redis client with config:', {
      url: process.env.REDIS_URL ? 'Using REDIS_URL (Upstash)' : 'localhost:6379',
      usingTLS: !!redisConfig.tls
    });
    
    redisClient = new Redis(redisConfig);

    redisClient.on('error', (err) => {
      logger.error('Redis error:', {
        message: err.message,
        code: err.code,
        command: err.command,
        stack: err.stack
      });
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('reconnecting', (delay) => {
      logger.info('Redis reconnecting...', { delay });
    });

    redisClient.on('ready', () => {
      logger.info('Redis client is ready');
    });

    // Add connection failure handler
    redisClient.on('end', () => {
      logger.warn('Redis connection ended');
      redisClient = null; // Allow recreation of client
    });
  }
  return redisClient;
}

// Helper function to safely execute Redis operations
export async function safeRedisOperation(operation) {
  try {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis client not available');
      return null;
    }
    return await operation(redis);
  } catch (error) {
    logger.error('Redis operation failed:', {
      error: error.message,
      operation: operation.name
    });
    return null;
  }
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
