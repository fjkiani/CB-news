import React, { useState, useEffect } from 'react';
import { NewsCard } from './NewsCard';
import { ProcessedArticle } from '../../types/article';
import { Loader2, RefreshCw } from 'lucide-react';

// Create a type that matches what Investing11 actually returns
interface Investing11Article {
  id: number;
  title: string;
  content: string;
  url: string;
  published_at: string;
  source: string;
  category: string;
  created_at: string;
  updated_at: string;
}

const BACKEND_URL = 'https://backend-khaki-omega.vercel.app';

export const Investing11News = () => {
  const [articles, setArticles] = useState<Investing11Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNews = async (forceRefresh = false) => {
    try {
      setIsRefreshing(forceRefresh);
      const response = await fetch(`${BACKEND_URL}/api/investing11/news${forceRefresh ? '?refresh=true' : ''}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setArticles(data.articles || []);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
    
    // Poll every 5 minutes during market hours
    const interval = setInterval(() => fetchNews(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchNews(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Trump News</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="text-red-500 p-4">
          Error: {error}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-gray-500 p-4">
          No Trump-related articles available at this time.
        </div>
      ) : (
        articles.map(article => (
          <NewsCard 
            key={article.id} 
            article={{
              ...article,
              raw: {
                title: article.title,
                content: article.content,
                url: article.url,
                publishedAt: article.published_at,
                source: article.source
              },
              keyPoints: [],
              entities: {
                companies: [],
                sectors: [],
                indicators: []
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
              },
              sentiment: {
                score: 0,
                label: 'neutral',
                confidence: 0
              }
            }} 
          />
        ))
      )}
    </div>
  );
}; 