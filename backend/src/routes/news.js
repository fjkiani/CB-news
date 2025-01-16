import express from 'express';
import logger from '../logger.js';

const router = express.Router();
let storage = null;

export function initializeRoutes(storageInstance) {
  storage = storageInstance;

  router.get('/recent', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const articles = await storage.getRecentArticles(limit);
      res.json(articles);
    } catch (error) {
      logger.error('Failed to fetch recent articles:', error);
      res.status(500).json({ error: 'Failed to fetch recent articles' });
    }
  });

  router.get('/search', async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      const articles = await storage.searchArticles(query);
      res.json(articles);
    } catch (error) {
      logger.error('Failed to search articles:', error);
      res.status(500).json({ error: 'Failed to search articles' });
    }
  });

  return router;
}

export default router;
