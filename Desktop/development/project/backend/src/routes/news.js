const express = require('express');
const router = express.Router();
const { scrapeNews, forceRefresh } = require('../scraper');

// Regular endpoint - uses cache
router.get('/trading-economics', async (req, res) => {
  try {
    const news = await scrapeNews();
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Force refresh endpoint
router.get('/trading-economics/refresh', async (req, res) => {
  try {
    const news = await forceRefresh();
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 