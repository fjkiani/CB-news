import axios from 'axios';
import logger from './logger';
import { CacheService } from './services/cache/CacheService';
import { DIFFBOT_FIELDS } from './config/diffbot';
import dotenv from 'dotenv';

dotenv.config();

// Initialize cache service
const cacheService = new CacheService({
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
}, logger);

// Cache settings
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION || '900', 10); // Convert to seconds for Redis

async function scrapeNews(forceFresh = false) {
  const startTime = Date.now();
  try {
    const targetUrl = process.env.TARGET_URL || 'https://tradingeconomics.com/stream?c=united+states';
    const cacheKey = `diffbot:${targetUrl}`;

    // Try to get from cache first, unless forceFresh is true
    if (!forceFresh) {
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        const duration = Date.now() - startTime;
        logger.info('Cache HIT', {
          duration: `${duration}ms`,
          articleCount: cachedData.length,
          cacheKey
        });
        return cachedData;
      }
      logger.info('Cache MISS', { cacheKey });
    }

    logger.info('Fetching fresh data from Diffbot', {
      forceFresh,
      targetUrl
    });

    // Validate environment variables
    if (!process.env.DIFFBOT_TOKEN) {
      throw new Error('DIFFBOT_TOKEN is not configured');
    }

    const response = await axios.get(process.env.DIFFBOT_API_URL || 'https://api.diffbot.com/v3/article', {
      params: {
        url: targetUrl,
        token: process.env.DIFFBOT_TOKEN,
        discussion: true,
        fields: DIFFBOT_FIELDS.join(',')
      },
      timeout: 10000,
      validateStatus: status => status === 200
    });

    logger.info('Diffbot response received', {
      status: response.status,
      hasObjects: !!response.data.objects,
      objectCount: response.data.objects?.length,
      hasPosts: !!response.data.objects?.[0]?.discussion?.posts
    });

    if (!response.data.objects?.[0]?.discussion?.posts) {
      throw new Error('No posts found in Diffbot response');
    }

    const posts = response.data.objects[0].discussion.posts;
    const articles = posts.map((post, index) => ({
      title: post.author || 'Economic Update',
      content: post.text || '',
      url: post.authorUrl || targetUrl,
      publishedAt: post.date || new Date().toISOString(),
      source: 'Trading Economics',
      category: post.authorUrl?.split('?i=')?.[1] || 'General',
      sentiment: {
        score: post.sentiment || 0,
        label: getSentimentLabel(post.sentiment || 0),
        confidence: Math.abs(post.sentiment || 0)
      },
      summary: post.text || '',
      author: post.author || 'Trading Economics',
      id: `te-${Date.now()}-${index}`
    }));

    // Log timing for API call
    const apiDuration = Date.now() - startTime;
    logger.info('Diffbot API call completed', {
      duration: `${apiDuration}ms`,
      articleCount: articles.length
    });

    // Save to cache with timing
    const cacheStart = Date.now();
    await cacheService.set(cacheKey, articles, CACHE_DURATION);
    const cacheDuration = Date.now() - cacheStart;
    
    logger.info('Cache updated', {
      cacheDuration: `${cacheDuration}ms`,
      articleCount: articles.length,
      cacheDurationSeconds: CACHE_DURATION
    });

    return articles;

  } catch (error) {
    logger.error('Scraping failed:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      config: {
        url: error.config?.url,
        params: error.config?.params
      }
    });

    // Try to return cached data on error
    try {
      const cacheKey = `diffbot:${process.env.TARGET_URL}`;
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData && cachedData.length > 0) {
        logger.info(`Returning ${cachedData.length} cached articles`);
        return cachedData;
      }
    } catch (cacheError) {
      logger.error('Cache fallback failed:', cacheError);
    }

    // Return empty array if everything fails
    return [];
  }
}

// Helper function
function getSentimentLabel(score: number): string {
  if (score >= 0.5) return 'positive';
  if (score <= -0.5) return 'negative';
  return 'neutral';
}

export { scrapeNews }; 