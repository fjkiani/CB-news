import express from 'express';
import cors from 'cors';
import { scrapeNews } from './scraper.js';
import logger from './logger.js';
import config from './config.js';
import analysisRoutes from './routes/analysis.js';
import newsRoutes from './routes/news.js';
import axios from 'axios';
import { SupabaseStorage } from './services/storage/supabase/supabaseStorage.js';
import getPort from 'get-port';
import { getRedisClient } from './services/redis/redisClient.js';

const app = express();
const storage = new SupabaseStorage();

// Configure CORS
app.use(cors({
  origin: config.CORS.ORIGINS,
  methods: config.CORS.METHODS,
  credentials: true
}));

// Add body parser for JSON
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const redis = getRedisClient();
    await redis.ping();
    res.json({ 
      status: 'ok',
      redis: 'connected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      redis: 'disconnected',
      error: error.message
    });
  }
});

// Test cache endpoint
app.get('/test/cache', async (req, res) => {
  try {
    logger.info('Testing cache functionality...');

    // First call - should hit Diffbot API
    logger.info('Making first call (should hit API)...');
    const startFirst = Date.now();
    const firstCall = await scrapeNews();
    const firstDuration = Date.now() - startFirst;
    
    // Second call - should hit cache
    logger.info('Making second call (should hit cache)...');
    const startSecond = Date.now();
    const secondCall = await scrapeNews();
    const secondDuration = Date.now() - startSecond;
    
    // Force fresh call - should hit API
    logger.info('Making force fresh call (should hit API)...');
    const startFresh = Date.now();
    const forceFresh = await scrapeNews(true);
    const freshDuration = Date.now() - startFresh;

    res.json({
      cacheTest: {
        firstCall: {
          duration: `${firstDuration}ms`,
          articleCount: firstCall.length
        },
        secondCall: {
          duration: `${secondDuration}ms`,
          articleCount: secondCall.length,
          isCached: secondDuration < firstDuration
        },
        forceFresh: {
          duration: `${freshDuration}ms`,
          articleCount: forceFresh.length
        },
        sampleArticle: firstCall[0] // Show first article as sample
      }
    });

  } catch (error) {
    logger.error('Cache test failed:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// News scraping endpoint
app.get('/api/scrape/trading-economics', async (req, res) => {
  try {
    logger.info('Starting news scraping...');
    const forceFresh = req.query.fresh === 'true';
    const articles = await scrapeNews(forceFresh);
    
    // Add this: Store scraped articles in Supabase
    for (const article of articles) {
      await storage.storeArticle(article);
    }
    
    res.json(articles);
  } catch (error) {
    logger.error('Scraping error:', error);
    res.status(500).json({ 
      error: 'Failed to scrape news',
      message: error.message 
    });
  }
});

// Add analysis routes
app.use('/api/analysis', analysisRoutes);

// Add this new endpoint
app.get('/test/diffbot-direct', async (req, res) => {
  try {
    const diffbotToken = process.env.VITE_DIFFBOT_TOKEN;
    logger.info('Testing Diffbot API directly with token:', diffbotToken.substring(0, 4) + '...');

    const response = await axios.get('https://api.diffbot.com/v3/article', {
      params: {
        token: diffbotToken,
        url: 'https://tradingeconomics.com/united-states/indicators',  // Changed URL
        format: 'json'
      }
    });

    logger.info('Direct Diffbot response:', {
      status: response.status,
      hasData: !!response.data,
      objects: response.data.objects?.length || 0
    });

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    logger.error('Direct Diffbot test failed:', {
      message: error.message,
      response: error.response?.data
    });

    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

// Add the new news routes
app.use('/api/news', newsRoutes);

const PORT = 3001;  // Match the frontend's default port

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});