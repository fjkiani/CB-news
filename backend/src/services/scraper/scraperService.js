import { getRedisClient, safeRedisOperation } from '../redis/redisClient.js';
import logger from '../../logger.js';

export async function getCachedArticles(source) {
  return await safeRedisOperation(async (redis) => {
    const cacheKey = `articles:${source}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    return null;
  }) || [];
}

export async function cacheArticles(source, articles) {
  return await safeRedisOperation(async (redis) => {
    const cacheKey = `articles:${source}`;
    await redis.set(cacheKey, JSON.stringify(articles), 'EX', 3600); // Cache for 1 hour
    return true;
  }) || false;
}

export async function getLastProcessedArticle(source) {
  return await safeRedisOperation(async (redis) => {
    const key = `last_processed:${source}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  });
}

export async function setLastProcessedArticle(source, article) {
  return await safeRedisOperation(async (redis) => {
    const key = `last_processed:${source}`;
    await redis.set(key, JSON.stringify(article));
    return true;
  }) || false;
} 