import express from 'express';
import logger from '../logger.js';
import Redis from 'ioredis';
import DeepSeekService from '../services/DeepSeekService.js';

const router = express.Router();

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Initialize DeepSeek service
const deepSeekService = new DeepSeekService();

const CACHE_DURATION = 3600; // 1 hour in seconds
const ANALYSIS_TIMEOUT = 120000; // 2 minutes in milliseconds

// Queue for managing concurrent requests
const requestQueue = new Map();

// Helper function to create consistent cache keys
function createCacheKey(content) {
  return `analysis:${Buffer.from(content.slice(0, 100)).toString('base64')}`;
}

// Wrapper for Redis get with error handling
async function getCachedAnalysis(key) {
  try {
    const cached = await redis.get(key);
    if (cached) {
      logger.info('Analysis cache HIT', { key });
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.error('Redis get error:', error);
  }
  return null;
}

// Wrapper for Redis set with error handling
async function setCachedAnalysis(key, value) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', CACHE_DURATION);
    logger.info('Analysis cached', { key });
  } catch (error) {
    logger.error('Redis set error:', error);
  }
}

// Queue management functions
function isRequestInQueue(key) {
  return requestQueue.has(key);
}

function addToQueue(key, promise) {
  requestQueue.set(key, promise);
  return promise.finally(() => requestQueue.delete(key));
}

router.post('/market-impact', async (req, res) => {
  try {
    const { content, title, url, source, publishedAt } = req.body;
    
    if (!content) {
      return res.status(400).json({
        error: 'No content provided for analysis'
      });
    }

    // Create cache key
    const cacheKey = createCacheKey(content);

    // Check cache first
    const cached = await getCachedAnalysis(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Check if this request is already being processed
    if (isRequestInQueue(cacheKey)) {
      logger.info('Request already in queue, waiting for result', { cacheKey });
      const result = await requestQueue.get(cacheKey);
      return res.json(result);
    }

    // Prepare article object
    const article = {
      content,
      title,
      url,
      source,
      publishedAt
    };

    // Create analysis promise with timeout
    const analysisPromise = Promise.race([
      deepSeekService.analyzeContent(article),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Analysis timeout')), ANALYSIS_TIMEOUT)
      )
    ]);

    // Add to queue and process
    const queuedPromise = addToQueue(cacheKey, analysisPromise);

    try {
      const result = await queuedPromise;
      
      // Cache the result
      await setCachedAnalysis(cacheKey, result);
      
      return res.json(result);
    } catch (error) {
      if (error.message === 'Analysis timeout') {
        return res.status(504).json({
          error: 'Request timeout',
          message: 'The request took too long to process'
        });
      }
      throw error;
    }

  } catch (error) {
    logger.error('Analysis error:', {
      error: error.message,
      stack: error.stack
    });

    // Send appropriate error response
    if (error.message.includes('Rate limit exceeded')) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Please try again later'
      });
    }

    // Don't send multiple responses
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Analysis failed',
        message: error.message
      });
    }
  }
});

router.post('/batch-market-impact', async (req, res) => {
  try {
    const { articles } = req.body;
    
    if (!Array.isArray(articles)) {
      return res.status(400).json({ error: 'Expected array of articles' });
    }

    const results = await Promise.all(
      articles.map(async article => {
        const cacheKey = createCacheKey(article.content);
        
        // Try cache first
        const cached = await getCachedAnalysis(cacheKey);
        if (cached) {
          return { articleId: article.id, ...cached };
        }

        // Get fresh analysis
        const analysis = await deepSeekService.analyzeContent(article);
        await setCachedAnalysis(cacheKey, analysis);
        
        return { articleId: article.id, ...analysis };
      })
    );

    res.json(results);

  } catch (error) {
    logger.error('Batch analysis error:', {
      error: error.message,
      stack: error.stack
    });
    
    if (error.message.includes('Rate limit exceeded')) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Please try again later'
      });
    }

    res.status(500).json({ 
      error: 'Analysis failed',
      message: error.message
    });
  }
});

// Cache management endpoint
router.post('/clear-cache', async (req, res) => {
  try {
    const keys = await redis.keys('analysis:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    res.json({ message: `Cleared ${keys.length} cached analyses` });
  } catch (error) {
    logger.error('Cache clear error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;