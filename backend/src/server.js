const express = require('express');
const cors = require('cors');
const { scrapeNews } = require('./scraper');
const logger = require('./logger');
const config = require('./config');
const analysisRoutes = require('./routes/analysis');

const app = express();

// Configure CORS
app.use(cors({
  origin: config.CORS.ORIGINS,
  methods: config.CORS.METHODS,
  credentials: true
}));

// Add body parser for JSON
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// News scraping endpoint
app.get('/api/scrape/trading-economics', async (req, res) => {
  try {
    logger.info('Starting news scraping...');
    const forceFresh = req.query.fresh === 'true';
    const articles = await scrapeNews(forceFresh);
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

const PORT = config.PORT;

app.listen(PORT, () => {
  logger.info(`Scraper service running on port ${PORT}`);
  logger.info(`Health check available at http://localhost:${PORT}/health`);
  logger.info(`Scraping endpoint at http://localhost:${PORT}/api/scrape/trading-economics`);
  logger.info(`Analysis endpoint at http://localhost:${PORT}/api/analysis/market-impact`);
});