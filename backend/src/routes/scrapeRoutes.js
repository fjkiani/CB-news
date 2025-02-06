import express from 'express';
import { getCachedArticles, cacheArticles } from '../services/scraper/scraperService.js';
import { scrapeNews } from '../services/scraper/newsScraper.js';
import logger from '../logger.js';

const router = express.Router();

router.get('/trading-economics', async (req, res) => {
  const source = 'trading-economics';
  const fresh = req.query.fresh === 'true';
  
  try {
    // First try to get cached articles
    const cachedArticles = await getCachedArticles(source);
    
    if (!fresh && cachedArticles && cachedArticles.length > 0) {
      logger.info('Returning cached articles', { count: cachedArticles.length });
      return res.json(cachedArticles);
    }

    // If fresh data requested or no cache, trigger scraping
    if (fresh) {
      // Start scraping in background
      scrapeNews(source).then(async (articles) => {
        if (articles && articles.length > 0) {
          await cacheArticles(source, articles);
          logger.info('Background scraping completed and cached', { count: articles.length });
        }
      }).catch(error => {
        logger.error('Background scraping failed:', error);
      });

      // Return cached data if available, otherwise empty array
      if (cachedArticles && cachedArticles.length > 0) {
        logger.info('Returning cached articles while scraping', { count: cachedArticles.length });
        return res.json(cachedArticles);
      }
      
      logger.info('No cached articles available, returning empty array while scraping');
      return res.json([]);
    }

    // If not fresh and no cache, scrape synchronously
    logger.info('No cached articles, scraping synchronously');
    const articles = await scrapeNews(source);
    if (articles && articles.length > 0) {
      await cacheArticles(source, articles);
    }
    return res.json(articles || []);

  } catch (error) {
    logger.error('Error in scraping endpoint:', error);
    
    // If we have cached data, return it even if there's an error
    const cachedArticles = await getCachedArticles(source).catch(() => []);
    if (cachedArticles && cachedArticles.length > 0) {
      logger.info('Returning cached articles after error', { count: cachedArticles.length });
      return res.json(cachedArticles);
    }
    
    // If all else fails, return a 500 with error details
    return res.status(500).json({
      error: 'Failed to fetch articles',
      message: error.message,
      suggestion: 'Please try again with fresh=false to get cached data'
    });
  }
});

export default router; 