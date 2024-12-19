import { useState, useEffect } from 'react';
import { RawNewsArticle } from '../services/news/types';
import { backendAPI } from '../services/backend/api';
import { supabase } from '../services/supabase/client';


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
        const articles = forceFresh 
          ? await backendAPI.scrapeNews(true)
          : await backendAPI.getRecentArticles();
        
        if (mounted) {
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

    fetchNews();

    const subscription = supabase
      .channel('articles')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'articles' 
        },
        (payload) => {
          if (mounted) {
            setNews(current => {
              const exists = current.some(article => 
                article.url === payload.new.url
              );
              if (exists) return current;
              return [payload.new, ...current];
            });
          }
        }
      )
      .subscribe();

    timeoutId = window.setInterval(() => {
      fetchNews(true);
    }, refreshInterval);

    return () => {
      mounted = false;
      window.clearInterval(timeoutId);
      subscription.unsubscribe();
    };
  }, [refreshInterval]);

  return { news, loading, error };
}