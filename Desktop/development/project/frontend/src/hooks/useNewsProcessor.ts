import { useCallback, useState } from 'react';
import { Article } from '../types';
import { analyzeArticles } from '../utils/marketImpactAnalyzer';

const CACHE_KEY = 'processed_news_cache';
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

interface CacheEntry {
  timestamp: number;
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
      const cacheData: CacheEntry = {
        timestamp: Date.now(),
        articles
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
      // If no cache, process articles
      console.log(`Processing ${articles.length} articles`);
      
      // Get analysis for all articles in one batch
      const analysisResults = await analyzeArticles(articles);
      
      // Merge analysis with articles
      const processedArticles = articles.map(article => {
        const analysis = analysisResults.find(
          result => result.articleId === article.id
        );
        
        return {
          ...article,
          analysis: analysis?.analysis || article.content,
          confidence: analysis?.confidence || article.sentiment?.score || 0,
          source: analysis?.source || 'diffbot'
        };
      });

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