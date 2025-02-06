import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import { NewsScheduler } from './services/news/scheduler.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Manually set environment variables
process.env.VITE_SUPABASE_URL = 'https://gpirjathvfoqjurjhdxq.supabase.co';
process.env.VITE_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwaXJqYXRodmZvcWp1cmpoZHhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU3MTExMywiZXhwIjoyMDUwMTQ3MTEzfQ.M3ST5Hjqe8lOvwYdrnAQdS8YGHUB9zsOTOy-izK0bt0';
process.env.VITE_DIFFBOT_TOKEN = 'a70dd1af6e654f5dbb12f3cd2d1406bb';
process.env.REDIS_URL = 'redis://default:AcvYAAIjcDE2ZjFkNjg5MTE5ZWE0NWJkOWU1NjNiMjZkYWUyMjE0NXAxMA@shining-starfish-52184.upstash.io:6379';
process.env.COHERE_API_KEY = 'SbVIWS96eV1fw0Fjv7EfeBGyhfxWQHSZr0PXjhYc';

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
    key.includes('VITE_') ||
    key.includes('COHERE')
  ),
  supabase: {
    hasUrl: !!process.env.VITE_SUPABASE_URL,
    hasKey: !!process.env.VITE_SUPABASE_KEY,
    urlStart: process.env.VITE_SUPABASE_URL?.substring(0, 20) + '...',
  },
  cohere: {
    hasKey: !!process.env.COHERE_API_KEY
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
import investing11Routes from './routes/investing11Routes.js';
import { Investing11Service } from './services/investing11Service.js';
import diffbotRoutes from './routes/diffbotRoutes.js';
import { getRedisClient } from './services/redis/redisClient.js';

const app = express();
const scheduler = new NewsScheduler();
const investing11Service = new Investing11Service();

// Configure CORS - Must be before any route handlers
app.use(cors({
  origin: config.CORS.ORIGINS,
  methods: config.CORS.METHODS,
  allowedHeaders: config.CORS.HEADERS,
  credentials: config.CORS.CREDENTIALS,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Add OPTIONS handler for preflight requests
app.options('*', cors());

// Add body parser for JSON
app.use(express.json());

// Set global timeout for all requests
app.use((req, res, next) => {
  // Set global timeout to 120 seconds
  req.setTimeout(120000);
  res.setTimeout(120000, () => {
    res.status(504).json({
      error: 'Request timeout',
      message: 'The request took too long to process'
    });
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', config.CORS.ORIGINS[0]);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      redis: !!process.env.REDIS_URL,
      supabase: !!process.env.VITE_SUPABASE_URL,
      diffbot: !!process.env.VITE_DIFFBOT_TOKEN
    }
  });
});

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

// Initialize routes with storage instance
const newsRouter = initNewsRoutes(storage);
app.use('/api/news', newsRouter);

// Add analysis routes
app.use('/api/analysis', analysisRoutes);

// Add Investing11 routes
app.use('/api/investing11', investing11Routes);

// Add Diffbot routes
app.use('/api/diffbot', diffbotRoutes);

// News scraping endpoint with Vercel-friendly timeout handling
app.get('/api/scrape/trading-economics', async (req, res) => {
  try {
    const forceFresh = req.query.fresh === 'true';
    
    // Always try to get cached data first
    const redis = getRedisClient();
    const cachedData = await redis.get('trading-economics-news');
    
    if (cachedData) {
      const articles = JSON.parse(cachedData);
      logger.info('Returning cached articles', { count: articles.length });
      
      // If fresh data was requested, trigger background refresh
      if (forceFresh) {
        // Trigger background refresh without waiting
        scrapeNews(true).catch(error => {
          logger.error('Background refresh failed:', error);
        });
        
        res.setHeader('X-Background-Refresh', 'triggered');
      }
      
      return res.json(articles);
    }
    
    // If no cache and not forcing fresh, do a quick scrape
    if (!forceFresh) {
      const articles = await Promise.race([
        scrapeNews(false),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Quick scrape timeout')), 8000))
      ]);
      
      return res.json(articles || []);
    }
    
    // If forcing fresh and no cache, return empty and trigger background job
    scrapeNews(true).catch(error => {
      logger.error('Background refresh failed:', error);
    });
    
    res.setHeader('X-Background-Refresh', 'triggered');
    res.json([]);
    
  } catch (error) {
    logger.error('Scraping error:', {
      message: error.message,
      name: error.name
    });
    
    if (error.message === 'Quick scrape timeout') {
      res.status(504).json({ 
        error: 'Gateway Timeout',
        message: 'The scraping operation took too long. Please try again with fresh=false to get cached data.'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to scrape news',
        message: error.message 
      });
    }
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});