import axios from 'axios';
import logger from './logger.js';
import Redis from 'ioredis';
import path from 'path';
import { config } from 'dotenv';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load both .env files
dotenv.config({ path: path.resolve(__dirname, '../../.env') });  // For Redis
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env.local') });  // For Supabase

let redisClient = null;

function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://shining-starfish-52184.upstash.io:52184', {
      password: process.env.REDIS_PASSWORD,
      tls: { rejectUnauthorized: false }
    });
  }
  return redisClient;
}

// Debug: Print environment variables (safely)
console.log('Environment check:', {
  hasRedisUrl: !!process.env.REDIS_URL,
  hasRedisPassword: !!process.env.REDIS_PASSWORD,
  hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
  hasSupabaseKey: !!process.env.VITE_SUPABASE_KEY,
  keyType: process.env.VITE_SUPABASE_KEY?.includes('service_role') ? 'service_role' : 'anon'
});

export async function cleanup() {
  try {
    if (redisClient) {
      logger.info('Closing Redis connection...');
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed successfully');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    throw error;
  }
}

const CACHE_DURATION = 3600; // 1 hour

export async function scrapeNews(forceFresh = false) {
  try {
    console.log('Starting scrape operation...');
    
    const response = await axios.get('https://api.diffbot.com/v3/analyze', {
      params: {
        token: process.env.DIFFBOT_TOKEN,
        url: 'https://tradingeconomics.com/stream?c=united+states',
        naturalLanguage: true,
        format: 'json',
        tags: true,
      }
    });

    // Debug: Log API response
    console.log('Diffbot API response status:', response.status);
    console.log('Found objects:', response.data.objects?.length || 0);

    // Get all items from the response
    const newsItems = response.data.objects?.[0]?.items || [];
    console.log('Found news items:', newsItems.length);

    // Debug: Log first item if exists
    if (newsItems.length > 0) {
      console.log('Sample news item:', {
        title: newsItems[0].title,
        date: newsItems[0].date,
        link: newsItems[0].link
      });
    }

    const processedNews = newsItems.map((item, i) => {
      // Convert GMT to EST
      const publishedDate = item.date ? new Date(item.date) : null;
      const estDate = publishedDate ? 
        publishedDate.toLocaleString('en-US', { 
          timeZone: 'America/New_York',
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        }) : '';

      return {
        id: `te-${Date.now()}-${i}`,
        title: item.title || item["te-stream-title-div"]?.split('\n')[0] || item.summary?.split('.')[0],
        content: item.summary,
        url: item.link,
        publishedAt: estDate,
        source: 'Trading Economics',
        category: item["te-stream-category"]?.split('?i=')[1]?.replace('+', ' ') || 'Market News',
        sentiment: {
          score: item.sentiment || 0,
          label: getSentimentLabel(item.sentiment || 0),
          confidence: Math.abs(item.sentiment || 0)
        },
        summary: item.summary,
        author: 'Trading Economics',
        tags: []
      };
    });

    // Debug: Log processed results
    console.log('Processed articles:', processedNews.length);
    if (processedNews.length > 0) {
      console.log('Sample processed article:', {
        id: processedNews[0].id,
        title: processedNews[0].title,
        publishedAt: processedNews[0].publishedAt
      });
    }

    return processedNews;

  } catch (error) {
    console.error('Scraping failed:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });
    throw error;
  }
}
function getSentimentLabel(score) {
  if (score >= 0.1) return 'positive';
  if (score <= -0.1) return 'negative';
  return 'neutral';
}

export const forceRefresh = () => scrapeNews(true);
// Add this debug code
const cacheKey = 'diffbot:news';
const articles = await scrapeNews(true);  // Force fresh scrape

// Test caching explicitly
try {
  await redis.set(cacheKey, JSON.stringify(articles));
  console.log('Cache set successfully');
  
  // Verify it was saved
  const cached = await redis.get(cacheKey);
  console.log('Cached data:', cached ? 'Found' : 'Not found');
} catch (error) {
  console.error('Redis operation failed:', error);
}

