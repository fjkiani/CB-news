import axios from 'axios';
import logger from '../logger.js';
import { NewsClassificationService } from './newsClassificationService.js';
import { supabase } from '../supabase/client.js';

const INVESTING11_API_KEY = 'cdee5e97c8msh34c3fd1e0516cb2p13b5bdjsn85e981b0d4a5';
const INVESTING11_API_HOST = 'investing11.p.rapidapi.com';
const RATE_LIMIT_DELAY = 1500; // 1.5 seconds between requests
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const MAX_DAILY_CALLS = 50;
const IMPORTANT_KEYWORDS = ['fed', 'fomc', 'rate', 'inflation', 'gdp', 'earnings'];

let classificationService;

export class Investing11Service {
  constructor() {
    if (!classificationService) {
      classificationService = new NewsClassificationService();
      logger.info('NewsClassificationService initialized for Investing11');
    }
    this.apiCallsToday = 0;
    this.lastReset = new Date().setHours(0,0,0,0);
  }

  isMarketHours() {
    const now = new Date();
    const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hours = nyTime.getHours();
    const minutes = nyTime.getMinutes();
    const day = nyTime.getDay();

    // Check if it's a weekday (Monday-Friday)
    if (day === 0 || day === 6) return false;

    // Check if it's between 9:30 AM and 4:00 PM ET
    const marketOpen = hours > 9 || (hours === 9 && minutes >= 30);
    const marketClose = hours < 16;

    return marketOpen && marketClose;
  }

  async shouldMakeApiCall(query) {
    // Reset counter if it's a new day
    const today = new Date().setHours(0,0,0,0);
    if (today > this.lastReset) {
      this.apiCallsToday = 0;
      this.lastReset = today;
    }

    // Check if we've exceeded daily limit
    if (this.apiCallsToday >= MAX_DAILY_CALLS) {
      logger.warn('Daily API call limit reached:', { calls: this.apiCallsToday });
      return false;
    }

    // Check if we have recent cached results
    const { data: cachedArticles } = await supabase
      .from('articles')
      .select('*')
      .eq('source', 'Investing11')
      .order('created_at', { ascending: false })
      .limit(1);

    if (cachedArticles && cachedArticles.length > 0) {
      const lastFetchTime = new Date(cachedArticles[0].created_at).getTime();
      const isCacheValid = Date.now() - lastFetchTime < CACHE_DURATION;
      
      if (isCacheValid) {
        logger.info('Using cached results:', { 
          lastFetch: new Date(lastFetchTime).toISOString() 
        });
        return false;
      }
    }

    // Prioritize important keywords
    const isImportantQuery = IMPORTANT_KEYWORDS.some(keyword => 
      query.toLowerCase().includes(keyword)
    );

    if (!isImportantQuery && this.apiCallsToday > MAX_DAILY_CALLS * 0.7) {
      logger.info('Skipping non-priority query to conserve API calls:', { query });
      return false;
    }

    return true;
  }

  async fetchNews(forceRefresh = false) {
    try {
      // Check cache first (unless force refresh is requested)
      if (!forceRefresh) {
        const { data: cachedArticles } = await supabase
          .from('articles')
          .select('*')
          .eq('source', 'Investing11')
          .ilike('title', '%trump%')
          .order('created_at', { ascending: false })
          .limit(50);

        // If we have recent cached articles (less than 30 mins old), return them
        if (cachedArticles?.length > 0) {
          const mostRecent = new Date(cachedArticles[0].created_at).getTime();
          if (Date.now() - mostRecent < CACHE_DURATION) {
            logger.info('Returning cached Trump articles:', { 
              count: cachedArticles.length,
              mostRecent: new Date(mostRecent).toISOString()
            });
            return cachedArticles;
          }
        }
      }

      // If force refresh requested or cache is stale/empty, make API call
      logger.info('Fetching fresh Trump news from API', { forceRefresh });
      
      const url = `https://${INVESTING11_API_HOST}/search_news`;
      const options = {
        method: 'GET',
        url: url,
        params: { query: 'trump' },
        headers: {
          'X-RapidAPI-Key': INVESTING11_API_KEY,
          'X-RapidAPI-Host': INVESTING11_API_HOST,
          'Accept': 'application/json'
        }
      };

      const response = await axios(options);
      const newsData = response.data.data;
      
      if (!newsData) {
        throw new Error('No data array found in API response');
      }

      const articles = newsData
        .filter(article => article && article.title)
        .map((article, index) => ({
          id: Date.now() + index,
          title: article.title,
          content: article.description || 'No content available',
          url: article.url.startsWith('www.') ? `https://${article.url}` : article.url,
          published_at: new Date(article.published_at * 1000).toISOString(),
          source: 'Investing11',
          category: 'Market Analysis',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

      logger.info('Successfully fetched Trump articles:', {
        count: articles.length,
        sample: articles[0]?.title
      });

      // Store new articles
      if (articles.length > 0) {
        await this.storeArticles(articles);
      }

      return articles;

    } catch (error) {
      logger.error('Error fetching Trump news:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  async processArticles(rawArticles) {
    const processedArticles = [];

    for (const article of rawArticles) {
      try {
        // Format the article with required fields for Supabase
        const processedArticle = {
          id: `inv11-${Date.now()}-${processedArticles.length}`,
          title: article.title,
          content: article.description || 'No content available',
          url: article.url.startsWith('www.') ? `https://${article.url}` : article.url,
          published_at: new Date(article.published_at * 1000).toISOString(), // Convert Unix timestamp to ISO string
          source: 'Investing11',
          category: 'Market News',
          sentiment: {
            score: 0,
            label: 'neutral',
            confidence: 0
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        processedArticles.push(processedArticle);

      } catch (error) {
        console.error('Error processing article:', {
          title: article.title,
          error: error.message
        });
      }
    }

    return processedArticles;
  }

  async storeArticles(articles) {
    try {
      logger.info('Storing articles in Supabase:', { count: articles.length });

      const { data, error } = await supabase
        .from('articles')
        .upsert(
          articles.map(article => ({
            id: article.id,
            title: article.title,
            content: article.content,
            url: article.url,
            published_at: article.publishedAt || article.published_at,
            source: article.source,
            category: article.category,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })),
          {
            onConflict: 'id',
            ignoreDuplicates: false
          }
        );

      if (error) {
        throw error;
      }

      logger.info('Successfully stored articles:', {
        stored: data?.length,
        sample: data?.[0]?.title
      });

      return data;
    } catch (error) {
      logger.error('Error storing articles:', {
        message: error.message,
        code: error.code
      });
      throw error;
    }
  }
} 