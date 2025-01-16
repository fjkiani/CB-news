import { useCallback, useState } from 'react';
import { Article } from '../types';
import { analyzeArticles } from '../utils/marketImpactAnalyzer';

const CACHE_KEY = 'processed_news_cache';
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

interface CacheEntry {
  timestamp: number;  // This is for cache expiry only
  articles: Article[];
}

export const useNewsProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const getCache = useCallback((): CacheEntry | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data: CacheEntry = JSON.parse(cached);
      const age = Date.now() - data.timestamp;

      if (age < CACHE_DURATION) {
        console.log(`Using cached analysis (${Math.round(age / 1000)}s old)`);
        return data;
      }

      console.log(`Cache expired (${Math.round(age / 1000)}s old)`);
      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }, []);

  const setCache = useCallback((articles: Article[]) => {
    try {
      // Log articles before caching
      console.debug('Caching articles with dates:', articles.map(article => ({
        title: article.title,
        publishedAt: article.publishedAt,
        published_at: article.published_at,
        created_at: article.created_at
      })));

      const cacheData: CacheEntry = {
        timestamp: Date.now(),  // This is just for cache expiry
        articles: articles.map(article => ({
          ...article,
          // Ensure we preserve the original dates
          publishedAt: article.publishedAt,
          published_at: article.published_at,
          created_at: article.created_at
        }))
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }, []);

  const processArticles = useCallback(async (articles: Article[]) => {
    if (!articles.length) return articles;

    // Check cache first
    const cached = getCache();
    if (cached?.articles) {
      return cached.articles;
    }

    setIsProcessing(true);
    try {
      // Log articles before processing
      console.debug('Processing articles with dates:', articles.map(article => ({
        title: article.title,
        publishedAt: article.publishedAt,
        published_at: article.published_at,
        created_at: article.created_at
      })));

      // Get analysis for all articles in one batch
      const analysisResults = await analyzeArticles(articles);
      
      // Merge analysis with articles
      const processedArticles = articles.map(article => {
        const analysis = analysisResults.find(
          result => result.articleId === article.id
        );
        
        return {
          ...article,
          // Ensure we preserve the original dates
          publishedAt: article.publishedAt,
          published_at: article.published_at,
          created_at: article.created_at,
          // Add analysis data
          analysis: analysis?.analysis || article.content,
          confidence: analysis?.confidence || article.sentiment?.score || 0,
          source: analysis?.source || 'diffbot'
        };
      });

      // Log articles after processing
      console.debug('Processed articles with dates:', processedArticles.map(article => ({
        title: article.title,
        publishedAt: article.publishedAt,
        published_at: article.published_at,
        created_at: article.created_at
      })));

      // Cache the results
      setCache(processedArticles);
      
      return processedArticles;

    } catch (error) {
      console.error('Processing failed:', error);
      return articles; // Fallback to original articles
    } finally {
      setIsProcessing(false);
    }
  }, [getCache, setCache]);

  return { 
    processArticles,
    isProcessing,
    clearCache: () => localStorage.removeItem(CACHE_KEY)
  };
};