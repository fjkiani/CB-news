const axios = require('axios');
const logger = require('./logger');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const { DIFFBOT_FIELDS } = require('./config/diffbot');

// Cache settings
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION || '900000', 10);
const CACHE_FILE = process.env.CACHE_FILE || path.join(__dirname, '../cache/news-cache.json');

async function scrapeNews(forceFresh = false) {
  try {
    // Add detailed logging for debugging
    logger.info('Starting news scrape', {
      forceFresh,
      targetUrl: process.env.TARGET_URL,
      diffbotUrl: process.env.DIFFBOT_API_URL
    });

    // Validate environment variables
    if (!process.env.DIFFBOT_TOKEN) {
      throw new Error('DIFFBOT_TOKEN is not configured');
    }

    const response = await axios.get(process.env.DIFFBOT_API_URL || 'https://api.diffbot.com/v3/article', {
      params: {
        url: process.env.TARGET_URL || 'https://tradingeconomics.com/stream?c=united+states',
        token: process.env.DIFFBOT_TOKEN,
        discussion: true,
        fields: DIFFBOT_FIELDS.join(',')
      },
      // Add timeout and better error handling
      timeout: 10000,
      validateStatus: status => status === 200
    });

    // Log the response structure for debugging
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
      url: post.authorUrl || process.env.TARGET_URL,
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

    // Save valid articles to cache
    if (articles.length > 0) {
      await saveCache(articles);
      logger.info(`Successfully scraped ${articles.length} articles`);
    } else {
      logger.warn('No articles were scraped');
    }

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
      const cache = await loadCache();
      if (cache.data && cache.data.length > 0) {
        logger.info(`Returning ${cache.data.length} cached articles`);
        return cache.data;
      }
    } catch (cacheError) {
      logger.error('Cache fallback failed:', cacheError);
    }

    // Return empty array if everything fails
    return [];
  }
}

// Helper functions
function getSentimentLabel(score) {
  if (score >= 0.5) return 'positive';
  if (score <= -0.5) return 'negative';
  return 'neutral';
}

async function loadCache() {
  try {
    const cacheDir = path.dirname(CACHE_FILE);
    await fs.mkdir(cacheDir, { recursive: true });
    
    const data = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { timestamp: 0, data: [] };
  }
}

async function saveCache(data) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (error) {
    logger.error('Failed to save cache:', error);
  }
}

module.exports = { scrapeNews };