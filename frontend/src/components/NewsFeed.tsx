import React, { useEffect, useState } from 'react';
import { useNewsScraper } from '../hooks/useNewsScraper';
import { useNewsProcessor } from '../hooks/useNewsProcessor';
import { Article } from '../types';
import { NewsCard } from '../../../src/components/News/NewsCard';
import type { ProcessedArticle } from '../../../src/services/news/types';

const CACHE_KEY = 'news_analysis_cache';
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

function NewsFeed() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { fetchArticles } = useNewsScraper();
  const { processArticles } = useNewsProcessor();

  // Transform Article to ProcessedArticle
  const transformArticle = (article: Article): ProcessedArticle => {
    // Log incoming article dates
    console.debug('Transforming article dates:', {
      title: article.title,
      incoming: {
        publishedAt: article.publishedAt,
        published_at: article.published_at,
        created_at: article.created_at,
        raw_data: article.raw_data
      }
    });

    // Get the most reliable date field in order of preference
    const getArticleDate = () => {
      const dateStr = article.published_at || article.publishedAt || article.created_at;
      if (!dateStr) {
        console.warn('No date available for article:', article.title);
        return new Date().toISOString(); // Use current time as fallback
      }
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString();
    };

    const formattedDate = getArticleDate();

    console.debug('Using date:', {
      title: article.title,
      publishedAt: formattedDate,
      originalDates: {
        published_at: article.published_at,
        publishedAt: article.publishedAt,
        created_at: article.created_at
      },
      parsed: new Date(formattedDate).toISOString(),
      components: {
        year: new Date(formattedDate).getUTCFullYear(),
        month: new Date(formattedDate).getUTCMonth() + 1,
        day: new Date(formattedDate).getUTCDate(),
        hours: new Date(formattedDate).getUTCHours(),
        minutes: new Date(formattedDate).getUTCMinutes()
      }
    });

    return {
      id: article.id,
      raw: {
        title: article.title,
        content: article.content,
        url: article.url,
        publishedAt: formattedDate,
        source: article.source,
        naturalLanguage: article.naturalLanguage,
        tags: article.tags,
        created_at: article.created_at
      },
      summary: article.summary || article.content.substring(0, 200),
      keyPoints: [],
      entities: {
        companies: [],
        sectors: [],
        indicators: []
      },
      sentiment: {
        score: article.sentiment?.score || 0,
        label: (article.sentiment?.label || 'neutral') as 'positive' | 'negative' | 'neutral',
        confidence: article.sentiment?.confidence || 0
      },
      marketImpact: {
        shortTerm: {
          description: '',
          confidence: 0,
          affectedSectors: []
        },
        longTerm: {
          description: '',
          confidence: 0,
          potentialRisks: []
        }
      }
    };
  };

  // Helper function to sort articles by date
  const sortArticles = (articlesToSort: Article[]) => {
    return [...articlesToSort].sort((a, b) => {
      // Get the most reliable date field in order of preference
      const getArticleDate = (article: Article) => {
        const dateStr = article.published_at || article.publishedAt || article.created_at;
        if (!dateStr) {
          console.warn('No date available for article:', article.title);
          return new Date(0); // Default to epoch if no date available
        }
        return new Date(dateStr);
      };

      const dateA = getArticleDate(a);
      const dateB = getArticleDate(b);
      
      // Log sorting for debugging
      console.debug('Sorting articles:', {
        a: {
          title: a.title,
          date: dateA.toISOString(),
          published_at: a.published_at,
          publishedAt: a.publishedAt,
          created_at: a.created_at,
          timestamp: dateA.getTime()
        },
        b: {
          title: b.title,
          date: dateB.toISOString(),
          published_at: b.published_at,
          publishedAt: b.publishedAt,
          created_at: b.created_at,
          timestamp: dateB.getTime()
        }
      });
      
      return dateB.getTime() - dateA.getTime();
    });
  };

  const loadNews = async (forceFresh = false) => {
    setIsLoading(true);
    try {
      // Clear cache if forcing fresh data
      if (forceFresh) {
        console.log('Forcing fresh data - clearing cache');
        localStorage.removeItem(CACHE_KEY);
      }

      // Check cache unless forcing fresh data
      if (!forceFresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { timestamp, articles: cachedArticles } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          if (age < CACHE_DURATION) {
            console.log(`Using cached news data (${Math.round(age / 1000)}s old)`);
            // Sort cached articles before setting
            const sortedCachedArticles = sortArticles(cachedArticles);
            setArticles(sortedCachedArticles);
            return;
          } else {
            console.log(`Cache expired (${Math.round(age / 1000)}s old) - fetching fresh data`);
          }
        }
      }

      // Fetch and process fresh articles
      console.log('Fetching fresh news data...');
      const freshArticles = await fetchArticles();
      
      console.log('Fresh articles fetched:', freshArticles.length);
      
      if (freshArticles.length) {
        // Log raw articles before processing
        console.debug('Raw articles before processing:', freshArticles.map(article => ({
          title: article.title,
          publishedAt: article.publishedAt,
          published_at: article.published_at,
          created_at: article.created_at,
          timestamp: new Date(article.created_at).getTime()
        })));

        const processedArticles = await processArticles(freshArticles);
        
        // Log articles after processing
        console.debug('Articles after processing:', processedArticles.map(article => ({
          title: article.title,
          publishedAt: article.publishedAt,
          published_at: article.published_at,
          created_at: article.created_at,
          timestamp: new Date(article.created_at).getTime()
        })));

        // Sort articles before caching and setting state
        const sortedArticles = sortArticles(processedArticles);
        
        // Cache the sorted articles
        const cacheData = {
          timestamp: Date.now(),
          articles: sortedArticles
        };
        console.log('Caching articles:', {
          count: sortedArticles.length,
          timestamp: new Date(cacheData.timestamp).toISOString(),
          newest: sortedArticles[0]?.created_at,
          oldest: sortedArticles[sortedArticles.length - 1]?.created_at
        });
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        
        setArticles(sortedArticles);
      } else {
        console.warn('No articles returned from fetch');
      }
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load news on mount
  useEffect(() => {
    loadNews();
  }, []);

  // Re-sort articles whenever they change
  useEffect(() => {
    if (articles.length > 0) {
      const sortedArticles = sortArticles(articles);
      if (JSON.stringify(sortedArticles) !== JSON.stringify(articles)) {
        setArticles(sortedArticles);
      }
    }
  }, [articles]);

  return (
    <div>
      <div className="controls">
        <button 
          onClick={() => loadNews(true)}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Refreshing...' : 'Refresh News'}
        </button>
        {articles.length > 0 && (
          <span className="ml-4 text-gray-600">
            {articles.length} articles loaded
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="loading text-center py-8">Loading news...</div>
      ) : (
        <div className="grid gap-6 mt-6">
          {articles.map(article => (
            <NewsCard 
              key={article.id} 
              article={transformArticle(article)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default NewsFeed;