import axios from 'axios';
import logger from './logger.js';
import Redis from 'ioredis';
import path from 'path';
import { config } from 'dotenv';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../../.env') });

let redisClient = null;

function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis({
      host: 'localhost',
      port: 6379
    });
  }
  return redisClient;
}

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
    const redis = getRedisClient();
    const cacheKey = 'diffbot:news';

    if (forceFresh) {
      await redis.del(cacheKey);
    }

    const response = await axios.get('https://api.diffbot.com/v3/analyze', {
      params: {
        token: process.env.VITE_DIFFBOT_TOKEN,
        url: 'https://tradingeconomics.com/stream?c=united+states',
        naturalLanguage: true,
        format: 'json',
        tags: true,
      }
    });

    // Get all items from the response
    const newsItems = response.data.objects?.[0]?.items || [];
    console.log('Found items:', newsItems.length);

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

    const validNews = processedNews.filter(item => 
      item.content && 
      item.content.length > 10
    );

    console.log('Final valid news items:', validNews.length);

    if (validNews.length > 0) {
      await redis.set(cacheKey, JSON.stringify(validNews), 'EX', CACHE_DURATION);
    }

    return validNews;

  } catch (error) {
    logger.error('Scraping failed:', error);
    throw error;
  }
}

function getSentimentLabel(score) {
  if (score >= 0.1) return 'positive';
  if (score <= -0.1) return 'negative';
  return 'neutral';
}

export const forceRefresh = () => scrapeNews(true);