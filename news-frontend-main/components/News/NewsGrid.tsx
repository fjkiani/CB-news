import React, { useState } from 'react';
import { ProcessedArticle } from '../../services/news/types';
import { NewsCard } from './NewsCard';
import { Newspaper, Loader2, RefreshCw, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase/client';

interface NewsGridProps {
  articles: ProcessedArticle[];
  loading: boolean;
}

// Use environment variable for backend URL, fallback to local development URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const NewsGrid: React.FC<NewsGridProps> = ({ articles, loading }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logs, setLogs] = useState<{ level: string; message: string; timestamp: string }[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const { data: tradingEconomicsArticles, isLoading: isTradingEconomicsLoading, error: tradingEconomicsError, refetch } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('source', 'Trading Economics')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(article => ({
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
          shortTerm: { description: '', confidence: 0, affectedSectors: [] },
          longTerm: { description: '', confidence: 0, potentialRisks: [] }
        },
        sentiment: {
          score: 0,
          label: 'neutral',
          confidence: 0
        }
      }));
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setLogs([]); // Clear previous logs
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 290000);

      setLogs(prev => [...prev, {
        level: 'info',
        message: 'Starting news refresh. This may take a few minutes...',
        timestamp: new Date().toISOString()
      }]);

      console.log('Making request to:', `${BACKEND_URL}/api/scrape/trading-economics?fresh=true`);

      const response = await fetch(`${BACKEND_URL}/api/scrape/trading-economics?fresh=true`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Server responded with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add logs from the response
      if (data.logs) {
        setLogs(prev => [...prev, ...data.logs]);
        setShowLogs(true);
      }
      
      setLogs(prev => [...prev, {
        level: 'info',
        message: 'Refresh completed successfully',
        timestamp: new Date().toISOString()
      }]);
      
      // Refetch the articles from Supabase after updates
      await refetch();
    } catch (error: any) {
      console.error('Error refreshing news:', error);
      let errorMessage = 'Failed to refresh news. ';
      
      if (error.name === 'AbortError') {
        errorMessage = 'The request took too long to complete. The scraping process will continue in the background. Please check back in a few minutes.';
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = `Backend server is not accessible at ${BACKEND_URL}. Please check the connection.`;
      } else if (error.message.includes('504')) {
        errorMessage = 'The request timed out. The scraping process will continue in the background. Please check back in a few minutes.';
      } else {
        errorMessage += error.message;
      }
      
      setLogs(prev => [...prev, {
        level: 'error',
        message: errorMessage,
        timestamp: new Date().toISOString()
      }]);
      setShowLogs(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading || isTradingEconomicsLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (tradingEconomicsError) {
    return (
      <div className="text-red-500 p-4">
        Error loading news: {tradingEconomicsError.message}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <Newspaper className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No news articles</h3>
        <p className="text-gray-500">Check back later for market updates</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Trading Economics News</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {tradingEconomicsArticles && tradingEconomicsArticles.length > 0 ? (
        tradingEconomicsArticles.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))
      ) : (
        <div className="text-gray-500 p-4">
          No articles available at this time.
        </div>
      )}
    </div>
  );
};