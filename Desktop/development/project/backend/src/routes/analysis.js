const express = require('express');
const router = express.Router();
const { HfInference } = require('@huggingface/inference');
const logger = require('../logger');
const marketIndicators = require('../config/marketIndicators');

// In-memory cache for analysis results
const analysisCache = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

function getCacheKey(content) {
  // Use first 100 chars as key since similar articles will have same beginning
  return content.slice(0, 100);
}

async function getAnalysis(content) {
  const cacheKey = getCacheKey(content);
  
  // Check cache
  const cached = analysisCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    logger.info('Analysis cache HIT');
    return cached.result;
  }

  logger.info('Analysis cache MISS - performing new analysis');
  
  // Perform new analysis
  const result = analyzeContent(content, marketIndicators);
  
  // Cache the result
  analysisCache.set(cacheKey, {
    timestamp: Date.now(),
    result
  });

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

    // Use configurable analysis
    const result = analyzeContent(content, marketIndicators);
    res.json(result);

  } catch (error) {
    logger.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

// Batch analysis endpoint
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

module.exports = router;