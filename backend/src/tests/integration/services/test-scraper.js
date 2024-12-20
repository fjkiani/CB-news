import { scrapeNews } from '../../../scraper.js';
import { SupabaseStorage } from '../../../services/storage/supabase/supabaseStorage.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = '/Users/fahadkiani/Desktop/development/project/.env.local';
dotenv.config({ path: envPath });

async function testScrapeAndStore() {
  try {
    console.log('1. Testing scraper...');
    const articles = await scrapeNews(true);
    
    console.log('2. Scraped articles:', {
      count: articles.length,
      sample: articles[0] ? {
        title: articles[0].title,
        date: articles[0].publishedAt
      } : null
    });

    console.log('3. Storing articles in Supabase...');
    const storage = new SupabaseStorage();
    const result = await storage.storeArticles(articles);
    
    console.log('4. Storage result:', {
      success: !!result,
      count: result?.length || 0
    });

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testScrapeAndStore();