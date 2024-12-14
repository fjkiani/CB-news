import { RawNewsArticle } from '../types';
import { backendAPI } from '../../backend/api';
import { retry } from '../../../utils/retry';

export async function scrapeTradingEconomics(): Promise<RawNewsArticle[]> {
  try {
    console.log('Initiating news scraping from Trading Economics...');
    
    const articles = await retry(
      async () => {
        const response = await backendAPI.scrapeNews();
        
        if (!Array.isArray(response)) {
          console.error('Invalid response format:', response);
          throw new Error('Invalid response format from news scraper');
        }
        
        if (response.length === 0) {
          throw new Error('No articles returned from scraper');
        }
        
        return response;
      },
      {
        attempts: 3,
        delay: 2000,
        onError: (error, attempt) => {
          console.warn(`Scraping attempt ${attempt} failed:`, error);
        }
      }
    );

    console.log(`Successfully fetched ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('Error in scrapeTradingEconomics:', error);
    throw error;
  }
}