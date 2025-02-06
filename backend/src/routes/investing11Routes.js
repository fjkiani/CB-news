import express from 'express';
import { Investing11Service } from '../services/investing11Service.js';

const router = express.Router();
const investing11Service = new Investing11Service();

router.get('/news', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const articles = await investing11Service.fetchNews(forceRefresh);
    res.json({ 
      articles, 
      message: forceRefresh ? 'Fetched fresh data' : 'Success',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching Investing11 news:', error);
    res.status(500).json({ 
      error: 'Failed to fetch news',
      message: error.message 
    });
  }
});

export default router; 