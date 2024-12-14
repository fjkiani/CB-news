import { BACKEND_CONFIG } from './config';
import { ServiceStatus, ScraperError } from './types';
import { retry } from '../../utils/retry';

class BackendAPI {
  private static instance: BackendAPI;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = BACKEND_CONFIG.BASE_URL;
    console.log('Backend API initialized with URL:', this.baseUrl);
  }

  static getInstance(): BackendAPI {
    if (!BackendAPI.instance) {
      BackendAPI.instance = new BackendAPI();
    }
    return BackendAPI.instance;
  }

  async checkHealth(): Promise<ServiceStatus> {
    console.log('Checking backend health...');
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  }

  async scrapeNews(forceFresh = false) {
    try {
      console.log('Initiating news scraping...');
      const url = new URL(`${this.baseUrl}/api/scrape/trading-economics`);
      if (forceFresh) url.searchParams.set('fresh', 'true');

      const response = await retry(
        () => fetch(url.toString()),
        {
          attempts: BACKEND_CONFIG.RETRY_ATTEMPTS,
          delay: BACKEND_CONFIG.RETRY_DELAY,
          onError: (error, attempt) => {
            console.warn(`News scraping attempt ${attempt} failed:`, error);
          }
        }
      );

      if (!response.ok) {
        const error: ScraperError = await response.json();
        throw new Error(error.message || 'Failed to scrape news');
      }

      const data = await response.json();
      console.log(`Successfully fetched ${data.length} articles`);
      return data;
    } catch (error) {
      console.error('News scraping failed:', error);
      throw error;
    }
  }
}

export const backendAPI = BackendAPI.getInstance();