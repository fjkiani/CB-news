import { useState, useEffect } from 'react';
import { RawNewsArticle } from '../services/news/types';
import { backendAPI } from '../services/backend/api';

export function useNewsScraper(refreshInterval = 300000) {
  const [news, setNews] = useState<RawNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number;

    const fetchNews = async (forceFresh = false) => {
      try {
        setLoading(true);
        console.log('Fetching news articles...');
        const articles = await backendAPI.scrapeNews(forceFresh);
        
        if (mounted) {
          console.log(`Setting ${articles.length} articles`);
          setNews(articles);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch news:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch news'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const scheduleNextFetch = () => {
      timeoutId = window.setTimeout(() => {
        fetchNews(true).then(() => {
          if (mounted) {
            scheduleNextFetch();
          }
        });
      }, refreshInterval);
    };

    fetchNews().then(() => {
      if (mounted) {
        scheduleNextFetch();
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [refreshInterval]);

  return { news, loading, error };
}