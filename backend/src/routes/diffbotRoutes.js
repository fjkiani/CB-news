import express from 'express';
import { scrapeNews } from '../scraper.js';
import logger from '../logger.js';

const router = express.Router();

router.get('/news', async (req, res) => {
  try {
    logger.info('Fetching news articles from Diffbot', {
      refresh: req.query.refresh === 'true',
      timestamp: new Date().toISOString()
    });

    const forceRefresh = req.query.refresh === 'true';
    const articles = await scrapeNews(forceRefresh);
    
    logger.info('Fetched articles:', {
      count: articles.length,
      newest: articles[0]?.created_at,
      oldest: articles[articles.length - 1]?.created_at
    });

    res.json({
      articles,
      message: forceRefresh ? 'Fetched fresh articles' : 'Retrieved articles from cache'
    });
  } catch (error) {
    logger.error('Error fetching news:', error);
    res.status(500).json({ 
      error: 'Failed to fetch news',
      message: error.message 
    });
  }
});

export default router;
