import express from 'express';
import { scrapeNews, forceRefresh } from '../scraper.js';
import { SupabaseStorage } from '../services/storage/supabase/supabaseStorage.js';
import logger from '../logger.js';

const router = express.Router();
const storage = new SupabaseStorage();

// Get recent news from Supabase
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const news = await storage.getRecentArticles(limit);
    res.json(news);
  } catch (error) {
    logger.error('Failed to fetch news:', error);
    res.status(500).json({ 
      error: 'Failed to fetch news',
      message: error.message 
    });
  }
});

// Search news in Supabase
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const news = await storage.searchArticles(query);
    res.json(news);
  } catch (error) {
    logger.error('Search failed:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    });
  }
});

// Regular endpoint - uses cache and stores in Supabase
router.get('/trading-economics', async (req, res) => {
  try {
    const news = await scrapeNews();
    // Store in Supabase
    for (const article of news) {
      await storage.storeArticle(article);
    }
    res.json(news);
  } catch (error) {
    logger.error('Failed to fetch Trading Economics news:', error);
    res.status(500).json({ error: error.message });
  }
});

// Force refresh endpoint and store in Supabase
router.get('/trading-economics/refresh', async (req, res) => {
  try {
    const news = await forceRefresh();
    // Store in Supabase
    for (const article of news) {
      await storage.storeArticle(article);
    }
    res.json(news);
  } catch (error) {
    logger.error('Failed to refresh Trading Economics news:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
