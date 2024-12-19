import express from 'express';
import { HfInference } from '@huggingface/inference';
import logger from '../logger.js';
import marketIndicators from '../config/marketIndicators.js';
import Redis from 'ioredis';

const router = express.Router();

// Initialize Redis client
const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

const CACHE_DURATION = 3600; // 1 hour in seconds

// Helper function to create consistent cache keys
function createCacheKey(content) {
  // Create a more reliable cache key using content hash or first N chars
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

async function getAnalysis(content) {
  const cacheKey = createCacheKey(content);
  
  // Try to get from cache first
  const cached = await getCachedAnalysis(cacheKey);
  if (cached) {
    return cached;
  }

  logger.info('Analysis cache MISS - performing new analysis');
  
  // Perform new analysis
  const result = analyzeContent(content, marketIndicators);
  
  // Cache the result
  await setCachedAnalysis(cacheKey, result);

  return result;
}

function analyzeContent(content, indicators) {
  const lowerContent = content.toLowerCase();
  const analysis = {
    sentiment: 'neutral',
    sectors: [],
    topics: [],
    details: []
  };

  // Check sentiment
  const hasBearish = indicators.bearish.some(word => lowerContent.includes(word));
  const hasBullish = indicators.bullish.some(word => lowerContent.includes(word));
  
  if (hasBearish && !hasBullish) {
    analysis.sentiment = 'bearish';
  } else if (hasBullish && !hasBearish) {
    analysis.sentiment = 'bullish';
  }

  // Check sectors
  for (const [sector, keywords] of Object.entries(indicators.sectors)) {
    if (keywords.some(word => lowerContent.includes(word))) {
      analysis.sectors.push(sector);
    }
  }

  // Check topics
  for (const [topic, keywords] of Object.entries(indicators.topics)) {
    if (keywords.some(word => lowerContent.includes(word))) {
      analysis.topics.push(topic);
    }
  }

  // Generate readable analysis
  if (analysis.sentiment !== 'neutral') {
    analysis.details.push(`Market showing ${analysis.sentiment} signals.`);
  }

  if (analysis.sectors.length > 0) {
    analysis.details.push(`Affected sectors: ${analysis.sectors.join(', ')}.`);
  }

  if (analysis.topics.length > 0) {
    analysis.details.push(`Key factors: ${analysis.topics.join(', ')}.`);
  }

  return {
    analysis: analysis.details.join(' ') || 'No clear market signals detected.',
    sentiment: analysis.sentiment,
    sectors: analysis.sectors,
    topics: analysis.topics,
    confidence: 0.6,
    source: 'rule-based'
  };
}

router.post('/market-impact', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        error: 'No content provided for analysis'
      });
    }

    const result = await getAnalysis(content);
    res.json(result);

  } catch (error) {
    logger.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

// Update batch analysis to use the same caching mechanism
router.post('/batch-market-impact', async (req, res) => {
  try {
    const { articles } = req.body;
    
    if (!Array.isArray(articles)) {
      return res.status(400).json({ error: 'Expected array of articles' });
    }

    const results = await Promise.all(
      articles.map(async article => {
        const analysis = await getAnalysis(article.content);
        return {
          articleId: article.id,
          ...analysis
        };
      })
    );

    res.json(results);

  } catch (error) {
    logger.error('Batch analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Add a cache clear endpoint for development/testing
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