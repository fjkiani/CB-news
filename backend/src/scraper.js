import axios from 'axios';
import logger from './logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRedisClient, cleanup as cleanupRedis } from './services/redis/redisClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CACHE_DURATION = 300; // 5 minutes
const RATE_LIMIT_DELAY = 1500; // 1.5 seconds between requests
const LOOKBACK_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_AGE_DAYS = 30; // Don't accept articles older than this

async function analyzeStream(url) {
  logger.info('Analyzing news stream', { url });
  const response = await axios.get('https://api.diffbot.com/v3/analyze', {
    params: {
      token: process.env.DIFFBOT_TOKEN,
      url: url,
      discussion: false,
      timeout: 30000
    }
  });

  logger.info('Diffbot Analyze API response:', {
    status: response.status,
    url: url,
    type: response.data.type,
    numObjects: response.data.objects?.length,
    numItems: response.data.objects?.[0]?.items?.length,
    firstObject: response.data.objects?.[0]?.type,
    hasItems: !!response.data.objects?.[0]?.items,
    sampleItem: {
      title: response.data.objects?.[0]?.items?.[0]?.title,
      rawDate: response.data.objects?.[0]?.items?.[0]?.date,
      estimatedDate: response.data.objects?.[0]?.items?.[0]?.estimatedDate,
      timestamp: response.data.objects?.[0]?.items?.[0]?.timestamp
    }
  });

  if (!response.data?.objects?.[0]?.items) {
    logger.error('Invalid Diffbot response structure:', {
      type: response.data?.type,
      objects: response.data?.objects?.length,
      firstObject: response.data?.objects?.[0],
      raw: JSON.stringify(response.data).slice(0, 500)
    });
    throw new Error('Failed to analyze news stream: Invalid response structure');
  }

  return response.data;
}

async function tryCache(redis, forceFresh = false) {
  if (!forceFresh && redis) {
    try {
      const cachedData = await redis.get('trading-economics-news');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        logger.info('Returning cached data', { 
          articleCount: parsed.length,
          sample: parsed[0]?.title,
          newest: parsed[0]?.publishedAt,
          oldest: parsed[parsed.length - 1]?.publishedAt
        });
        return parsed;
      }
    } catch (error) {
      logger.warn('Cache retrieval failed, continuing with fresh data:', error.message);
    }
  }
  return null;
}

async function trySetCache(redis, processedNews) {
  if (redis && processedNews.length > 0) {
    try {
      await redis.set('trading-economics-news', JSON.stringify(processedNews), 'EX', CACHE_DURATION);
      logger.info('Cached processed news', { 
        count: processedNews.length,
        cacheDuration: CACHE_DURATION,
        newest: processedNews[0]?.publishedAt,
        oldest: processedNews[processedNews.length - 1]?.publishedAt
      });
    } catch (error) {
      logger.warn('Cache storage failed:', error.message);
    }
  }
}

async function getLastProcessedTimestamp(redis) {
  if (!redis) return null;
  try {
    const timestamp = await redis.get('last-processed-timestamp');
    return timestamp ? parseInt(timestamp) : null;
  } catch (error) {
    logger.warn('Failed to get last processed timestamp:', error.message);
    return null;
  }
}

async function setLastProcessedTimestamp(redis, timestamp) {
  if (!redis) return;
  try {
    await redis.set('last-processed-timestamp', timestamp.toString());
    logger.info('Updated last processed timestamp:', { timestamp });
  } catch (error) {
    logger.warn('Failed to set last processed timestamp:', error.message);
  }
}

async function getProcessedUrls(redis) {
  if (!redis) return new Set();
  try {
    const urls = await redis.get('processed-urls');
    return new Set(urls ? JSON.parse(urls) : []);
  } catch (error) {
    logger.warn('Failed to get processed URLs:', error.message);
    return new Set();
  }
}

async function updateProcessedUrls(redis, newUrls) {
  if (!redis) return;
  try {
    const existingUrls = await getProcessedUrls(redis);
    const combinedUrls = [...existingUrls, ...newUrls];
    // Keep only last 1000 URLs to prevent memory issues
    const recentUrls = combinedUrls.slice(-1000);
    await redis.set('processed-urls', JSON.stringify(recentUrls));
    logger.info('Updated processed URLs cache', { 
      newCount: newUrls.length,
      totalCount: recentUrls.length 
    });
  } catch (error) {
    logger.warn('Failed to update processed URLs:', error.message);
  }
}

export async function scrapeNews(forceFresh = false) {
  let redis;
  try {
    redis = getRedisClient();
  } catch (error) {
    logger.warn('Redis connection failed:', error.message);
  }

  try {
    logger.info('Starting scrape operation...', { forceFresh });
    
    // Try cache first
    const cachedNews = await tryCache(redis, forceFresh);
    if (cachedNews) return cachedNews;

    // Get last processed timestamp and URLs
    const lastProcessed = await getLastProcessedTimestamp(redis);
    const processedUrls = await getProcessedUrls(redis);
    
    logger.info('Previous scrape info:', { 
      lastProcessed,
      processedUrlsCount: processedUrls.size
    });

    // Get the news stream
    const streamUrl = 'https://tradingeconomics.com/stream?c=united+states';
    const analyzed = await analyzeStream(streamUrl);
    
    if (!analyzed?.objects?.[0]?.items) {
      throw new Error('Failed to analyze news stream');
    }

    // Extract articles from the analyzed data
    const articles = [];
    const seenUrls = new Set();
    const newUrls = new Set();
    let mostRecentValidDate = null;

    // Process each article from the analyzed data
    const items = analyzed.objects[0].items;

    // Log all dates first to understand the formats
    logger.info('All article dates from Diffbot:', items.map(item => ({
      title: item.title,
      date: item.date,
      timestamp: item.timestamp,
      estimatedDate: item.estimatedDate
    })));

    // First pass: find the most recent valid date
    for (const item of items) {
      const dateStr = item.date || item.timestamp || item.estimatedDate;
      if (dateStr) {
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const now = new Date();
            // Only consider dates within the last MAX_AGE_DAYS
            if (date <= now && date >= new Date(now.getTime() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000))) {
              if (!mostRecentValidDate || date > mostRecentValidDate) {
                mostRecentValidDate = date;
              }
            }
          }
        } catch (error) {
          // Ignore parsing errors in first pass
        }
      }
    }

    logger.info('Most recent valid date found:', {
      date: mostRecentValidDate?.toISOString(),
      humanReadable: mostRecentValidDate?.toString()
    });

    for (const item of items) {
      const url = item.link;
      if (!url) {
        logger.debug('Skipping article: No URL found', { title: item.title });
        continue;
      }
      
      if (seenUrls.has(url)) {
        logger.debug('Skipping article: Already seen in this batch', { url, title: item.title });
        continue;
      }
      
      // Skip if we've processed this URL recently
      if (processedUrls.has(url)) {
        logger.debug('Skipping article: Previously processed', { 
          url,
          title: item.title,
          date: item.date,
          estimatedDate: item.estimatedDate,
          timestamp: item.timestamp
        });
        continue;
      }
      
      // Log raw date information
      logger.info('Processing article date:', {
        title: item.title,
        rawDate: item.date,
        estimatedDate: item.estimatedDate,
        timestamp: item.timestamp,
        dateFields: Object.keys(item).filter(key => key.toLowerCase().includes('date')),
        allDateFields: Object.entries(item)
          .filter(([key]) => key.toLowerCase().includes('date'))
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      });
      
      // Parse and validate the date
      let publishedAt;
      try {
        // Try different date fields in order of preference
        const dateStr = item.date || item.timestamp || item.estimatedDate;
        if (!dateStr) {
          logger.warn('No date found for article, using most recent valid date:', { 
            title: item.title,
            fallbackDate: mostRecentValidDate?.toISOString() || new Date().toISOString()
          });
          publishedAt = mostRecentValidDate || new Date();
        } else {
          // Parse the date string, assuming it's in UTC
          publishedAt = new Date(dateStr);
          
          // Log the parsed date details
          logger.info('Date parsing details:', {
            title: item.title,
            originalDate: dateStr,
            parsedDate: publishedAt.toISOString(),
            utcString: publishedAt.toUTCString(),
            timestamp: publishedAt.getTime(),
            now: new Date().toISOString(),
            dateComponents: {
              year: publishedAt.getUTCFullYear(),
              month: publishedAt.getUTCMonth() + 1,
              day: publishedAt.getUTCDate(),
              hours: publishedAt.getUTCHours(),
              minutes: publishedAt.getUTCMinutes()
            }
          });
          
          // If date is invalid or in the future, use most recent valid date
          const now = new Date();
          if (isNaN(publishedAt.getTime()) || publishedAt > now) {
            logger.warn('Invalid or future date detected, using most recent valid date:', {
              originalDate: dateStr,
              parsedDate: publishedAt.toISOString(),
              title: item.title,
              now: now.toISOString(),
              fallbackDate: mostRecentValidDate?.toISOString() || now.toISOString()
            });
            publishedAt = mostRecentValidDate || now;
          }
          
          // Skip articles older than MAX_AGE_DAYS
          const age = now.getTime() - publishedAt.getTime();
          if (age > MAX_AGE_DAYS * 24 * 60 * 60 * 1000) {
            logger.debug('Skipping article: Too old', {
              title: item.title,
              date: publishedAt.toISOString(),
              age: Math.round(age / (24 * 60 * 60 * 1000)) + ' days'
            });
            continue;
          }
        }
      } catch (error) {
        logger.warn('Date parsing error, using most recent valid date:', {
          error: error.message,
          originalDate: item.date,
          estimatedDate: item.estimatedDate,
          timestamp: item.timestamp,
          title: item.title,
          fallbackDate: mostRecentValidDate?.toISOString() || new Date().toISOString()
        });
        publishedAt = mostRecentValidDate || new Date();
      }
      
      seenUrls.add(url);
      newUrls.add(url);
      
      try {
        // Rate limiting delay
        if (articles.length > 0) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }

        // Get category from the stream data
        const category = item['te-stream-category']?.split('?i=')?.[1]?.replace(/\+/g, ' ') || 'Market News';
        
        // Store the original date string for reference
        const originalDate = item.date || item.timestamp || item.estimatedDate;
        
        articles.push({
          id: `te-${Date.now()}-${articles.length}`,
          title: item.title,
          content: item.summary,
          url: url,
          publishedAt: publishedAt.toISOString(), // Store as ISO string
          originalDate: originalDate, // Store original date string
          source: 'Trading Economics',
          category: category,
          sentiment: {
            score: 0,
            label: 'neutral',
            confidence: 0
          },
          summary: item.summary,
          author: 'Trading Economics',
          tags: [category]
        });

        logger.info('Processed new article:', { 
          title: item.title,
          url: url,
          originalDate: originalDate,
          processedDate: publishedAt.toISOString(),
          category: category
        });

      } catch (error) {
        logger.error('Error processing article:', {
          url,
          error: error.message
        });
      }
    }

    // Sort articles by date
    articles.sort((a, b) => {
      const dateA = new Date(a.publishedAt);
      const dateB = new Date(b.publishedAt);
      
      // Log sorting for debugging
      logger.debug('Sorting articles:', {
        a: {
          title: a.title,
          date: a.publishedAt,
          parsed: dateA.toISOString()
        },
        b: {
          title: b.title,
          date: b.publishedAt,
          parsed: dateB.toISOString()
        }
      });
      
      return dateB.getTime() - dateA.getTime();
    });

    if (articles.length > 0) {
      logger.info('Sorted articles:', {
        count: articles.length,
        newest: {
          title: articles[0].title,
          date: articles[0].publishedAt
        },
        oldest: {
          title: articles[articles.length - 1].title,
          date: articles[articles.length - 1].publishedAt
        }
      });
      
      // Update last processed timestamp to newest article's date
      const newestTimestamp = new Date(articles[0].publishedAt).getTime();
      await setLastProcessedTimestamp(redis, newestTimestamp);
      
      // Update processed URLs cache
      await updateProcessedUrls(redis, Array.from(newUrls));
      
      // Try to cache the results
      await trySetCache(redis, articles);
    }

    logger.info('Scrape operation completed', {
      totalArticles: items.length,
      newArticles: articles.length,
      skippedUrls: items.length - articles.length,
      mostRecentValidDate: mostRecentValidDate?.toISOString()
    });

    return articles;

  } catch (error) {
    logger.error('Scraping failed:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      stack: error.stack
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
export const cleanup = cleanupRedis;

