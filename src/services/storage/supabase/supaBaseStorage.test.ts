// backend/src/tests/integration/supabase.test.ts
import { SupabaseStorage } from '@src/services/storage/supabase/supabaseStorage';
import { createClient } from '@supabase/supabase-js';
import logger from '../../../../backend/src/logger';
import { scrapeNews } from '../../../../backend/src/services/diffbot/pythonScraper';


describe('Supabase Storage Integration with Real Data', () => {
  let storage: SupabaseStorage;

  beforeAll(() => {
    storage = new SupabaseStorage();
  });

  it('should store and retrieve real Diffbot-processed articles', async () => {
    try {
      // Get real data from your scraper
      const articles = await scrapeNews(true); // true for forceFresh
      expect(articles).toBeTruthy();
      expect(articles.length).toBeGreaterThan(0);

      // Log the first article for debugging
      logger.info('First scraped article:', articles[0]);

      // Store the real articles
      const stored = await storage.storeArticles(articles);
      expect(stored).toBeTruthy();
      expect(stored.length).toBe(articles.length);

      // Verify storage
      const retrievedArticles = await storage.getRecentArticles(articles.length);
      expect(retrievedArticles.length).toBe(articles.length);

      // Compare first article
      const firstArticle = retrievedArticles[0];
      expect(firstArticle).toMatchObject({
        title: articles[0].title,
        content: articles[0].content,
        url: articles[0].url,
        source: articles[0].source,
        sentiment_score: articles[0].sentiment.score,
        sentiment_label: articles[0].sentiment.label
      });

      // Log successful storage
      logger.info(`Successfully stored ${stored.length} articles`);
      logger.info('Sample stored article:', firstArticle);

    } catch (error) {
      logger.error('Test failed:', error);
      throw error;
    }
  }, 30000); // Increased timeout for real API calls

  // Optional: Test specific article retrieval
  it('should retrieve articles by category', async () => {
    try {
      const category = 'Market News'; // Use a category you know exists
      const articles = await storage.getArticlesByCategory(category);
      expect(articles.length).toBeGreaterThan(0);
      
      // Log results
      logger.info(`Found ${articles.length} articles in category ${category}`);
      logger.info('Sample article:', articles[0]);
    } catch (error) {
      logger.error('Category test failed:', error);
      throw error;
    }
  });

  // Optional: Test search functionality
  it('should search articles', async () => {
    try {
      const searchTerm = 'inflation'; // Use a term likely to exist
      const articles = await storage.searchArticles(searchTerm);
      expect(articles.length).toBeGreaterThan(0);
      
      // Log results
      logger.info(`Found ${articles.length} articles matching "${searchTerm}"`);
      logger.info('Sample search result:', articles[0]);
    } catch (error) {
      logger.error('Search test failed:', error);
      throw error;
    }
  });

  // No cleanup needed as we're using real data we want to keep
});