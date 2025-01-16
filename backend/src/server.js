// First, only import what we need for environment setup
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { NewsScheduler } from './services/news/scheduler.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Manually set environment variables
process.env.VITE_SUPABASE_URL = 'https://gpirjathvfoqjurjhdxq.supabase.co';
process.env.VITE_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwaXJqYXRodmZvcWp1cmpoZHhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU3MTExMywiZXhwIjoyMDUwMTQ3MTEzfQ.M3ST5Hjqe8lOvwYdrnAQdS8YGHUB9zsOTOy-izK0bt0';
process.env.VITE_DIFFBOT_TOKEN = 'a70dd1af6e654f5dbb12f3cd2d1406bb';
process.env.REDIS_URL = 'redis://default:AcvYAAIjcDE2ZjFkNjg5MTE5ZWE0NWJkOWU1NjNiMjZkYWUyMjE0NXAxMA@shining-starfish-52184.upstash.io:6379';

// Also set non-VITE versions
process.env.DB_URL = process.env.VITE_SUPABASE_URL;
process.env.SERVICE_KEY = process.env.VITE_SUPABASE_KEY;
process.env.DIFFBOT_TOKEN = process.env.VITE_DIFFBOT_TOKEN;

// Debug environment loading
console.log('Environment loaded:', {
  envKeys: Object.keys(process.env).filter(key => 
    key.includes('SUPABASE') || 
    key.includes('DB_') || 
    key.includes('SERVICE_') ||
    key.includes('REDIS') ||
    key.includes('VITE_')
  ),
  supabase: {
    hasUrl: !!process.env.VITE_SUPABASE_URL,
    hasKey: !!process.env.VITE_SUPABASE_KEY,
    urlStart: process.env.VITE_SUPABASE_URL?.substring(0, 20) + '...',
  }
});

// Now import the rest of the modules
import express from 'express';
import cors from 'cors';
import { scrapeNews } from './scraper.js';
import logger from './logger.js';
import config from './config.js';
import { initializeRoutes as initNewsRoutes } from './routes/news.js';
import analysisRoutes from './routes/analysis.js';
import axios from 'axios';
import { SupabaseStorage } from './services/storage/supabase/supabaseStorage.js';

const app = express();
const scheduler = new NewsScheduler();

// Initialize SupabaseStorage first
let storage;
try {
  storage = new SupabaseStorage();
  logger.info('SupabaseStorage initialized successfully');
  
  // Start the scheduler after storage is initialized
  scheduler.start();
  logger.info('News scheduler started');
} catch (error) {
  logger.error('Failed to initialize services:', error);
  process.exit(1);
}

// Configure CORS
app.use(cors({
  origin: config.CORS.ORIGINS,
  methods: config.CORS.METHODS,
  credentials: true
}));

// Add body parser for JSON
app.use(express.json());

// Initialize routes with storage instance
const newsRouter = initNewsRoutes(storage);
app.use('/api/news', newsRouter);

// Add analysis routes
app.use('/api/analysis', analysisRoutes);

// News scraping endpoint
app.get('/api/scrape/trading-economics', async (req, res) => {
  try {
    logger.info('Starting news scraping...', {
      forceFresh: req.query.fresh === 'true',
      timestamp: new Date().toISOString()
    });

    const forceFresh = req.query.fresh === 'true';
    const articles = await scrapeNews(forceFresh);
    
    logger.info('Scraped articles:', {
      count: articles.length,
      newest: articles[0]?.created_at,
      oldest: articles[articles.length - 1]?.created_at
    });

    // Store scraped articles in Supabase
    for (const article of articles) {
      try {
        await storage.storeArticle(article);
        logger.info('Stored article:', {
          title: article.title,
          created_at: article.created_at,
          url: article.url
        });
      } catch (error) {
        logger.error('Failed to store article:', {
          error: error.message,
          article: {
            title: article.title,
            url: article.url
          }
        });
      }
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

// Add test endpoint for Diffbot API
app.get('/api/test-diffbot', async (req, res) => {
  const targetUrl = 'https://tradingeconomics.com/united-states/news';
  logger.info('Testing Diffbot API with URL:', { targetUrl });

  try {
    const response = await axios.get('https://api.diffbot.com/v3/analyze', {
      params: {
        url: targetUrl,
        token: process.env.VITE_DIFFBOT_TOKEN,
        fields: '*',
        discussion: true,
        timeout: 30000
      }
    });

    logger.info('Diffbot API Response:', {
      status: response.status,
      objectCount: response.data.objects?.length || 0,
      types: response.data.objects?.map(obj => obj.type),
      firstObject: response.data.objects?.[0],
      discussionCount: response.data.objects?.[0]?.discussion?.length || 0
    });

    res.json({
      status: 'success',
      data: response.data
    });
  } catch (error) {
    logger.error('Error calling Diffbot API:', {
      error: error.response?.data || error.message,
      status: error.response?.status
    });
    res.status(500).json({
      status: 'error',
      error: error.response?.data || error.message
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});