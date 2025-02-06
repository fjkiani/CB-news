import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase/client';
import { backendAPI } from '../services/backend/api';
import type { RawNewsArticle } from '../types';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useNewsScraper(refreshInterval = 300000) {
  const [news, setNews] = useState<RawNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('DISCONNECTED');

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      const articles = await backendAPI.getRecentArticles();
      console.log('Fetched articles:', articles.length);
      
      // Sort articles by date, most recent first
      const sortedArticles = [...articles].sort((a, b) => {
        const dateA = new Date(a.publishedAt || a.created_at);
        const dateB = new Date(b.publishedAt || b.created_at);
        
        // Log sorting for debugging
        // console.debug('Sorting articles:', {
        //   a: {
        //     title: a.title,
        //     publishedAt: a.publishedAt,
        //     created_at: a.created_at,
        //     parsed: dateA.toISOString(),
        //     timestamp: dateA.getTime()
        //   },
        //   b: {
        //     title: b.title,
        //     publishedAt: b.publishedAt,
        //     created_at: b.created_at,
        //     parsed: dateB.toISOString(),
        //     timestamp: dateB.getTime()
        //   }
        // });
        
        return dateB.getTime() - dateA.getTime();
      });
      
      // console.log('Sorted articles:', {
      //   count: sortedArticles.length,
      //   newest: {
      //     title: sortedArticles[0]?.title,
      //     publishedAt: sortedArticles[0]?.publishedAt,
      //     created_at: sortedArticles[0]?.created_at
      //   },
      //   oldest: {
      //     title: sortedArticles[sortedArticles.length - 1]?.title,
      //     publishedAt: sortedArticles[sortedArticles.length - 1]?.publishedAt,
      //     created_at: sortedArticles[sortedArticles.length - 1]?.created_at
      //   }
      // });
      
      setNews(sortedArticles);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch news:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch news'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper function to sort articles
  const sortArticles = useCallback((articles: RawNewsArticle[]) => {
    return [...articles].sort((a, b) => {
      const dateA = new Date(a.publishedAt || a.created_at);
      const dateB = new Date(b.publishedAt || b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number;
    let channel: RealtimeChannel;

    async function setupSubscription() {
      try {
        // Initial fetch
        await fetchNews();

        // Set up subscription
        channel = supabase.channel('articles-changes')
          .on(
            'postgres_changes',
            {
              event: '*', // Listen for all events
              schema: 'public',
              table: 'articles'
            },
            (payload: RealtimePostgresChangesPayload<RawNewsArticle>) => {
              console.log('Received real-time update:', payload);
              if (!mounted) return;

              if (payload.eventType === 'INSERT') {
                setNews(current => {
                  const newArticle = payload.new;
                  const exists = current.some(article => article.url === newArticle.url);
                  if (exists) return current;
                  // Sort the articles after adding the new one
                  return sortArticles([newArticle, ...current]);
                });
              } else if (payload.eventType === 'UPDATE') {
                setNews(current => {
                  const updated = current.map(article => 
                    article.id === payload.new.id ? payload.new : article
                  );
                  // Re-sort after update
                  return sortArticles(updated);
                });
              }
            }
          )
          .subscribe((status: string) => {
            console.log('Subscription status changed:', status);
            setSubscriptionStatus(status);
          });

        console.log('Channel setup complete');
      } catch (err) {
        console.error('Error setting up subscription:', err);
        setError(err instanceof Error ? err : new Error('Failed to setup subscription'));
      }
    }

    // Setup initial subscription
    setupSubscription();

    // Regular polling as backup
    timeoutId = window.setInterval(() => {
      if (subscriptionStatus !== 'SUBSCRIBED') {
        console.log('Polling for updates (subscription status:', subscriptionStatus + ')');
        fetchNews();
      }
    }, refreshInterval);

    return () => {
      mounted = false;
      window.clearInterval(timeoutId);
      if (channel) {
        console.log('Cleaning up subscription...');
        supabase.removeChannel(channel);
      }
    };
  }, [refreshInterval, fetchNews]);

  return { news, loading, error, subscriptionStatus };
}