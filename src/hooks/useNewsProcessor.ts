import { useState, useEffect } from 'react';
import { RawNewsArticle, ProcessedArticle } from '../services/news/types';

export function useNewsProcessor(articles: RawNewsArticle[]) {
  const [processedArticles, setProcessedArticles] = useState<ProcessedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Uses your system timezone
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch {
      return new Date().toLocaleString();
    }
  };

  useEffect(() => {
    const processArticles = async () => {
      try {
        setLoading(true);
        console.log('Processing articles:', articles);

        const processed = articles.map((article) => {
          console.log('Processing article:', article);
          
          const sentiment = {
            score: article.sentiment?.score ?? 0,
            label: article.sentiment?.label ?? 'neutral',
            confidence: article.sentiment?.confidence ?? 0
          };

          return {
            id: `${article.source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            raw: {
              ...article,
              publishedAt: article.raw_data?.date || article.created_at || new Date().toISOString(),
            },
            published_at: article.created_at || new Date().toISOString(),
            display_date: formatDate(article.created_at || new Date().toISOString()),
            summary: article.content?.slice(0, 200) + '...' ?? 'No content available',
            keyPoints: [article.content?.slice(0, 100) ?? 'No content available'],
            entities: {
              companies: [],
              sectors: [],
              indicators: []
            },
            sentiment,
            marketImpact: {
              shortTerm: {
                description: 'Analysis pending...',
                confidence: 0,
                affectedSectors: []
              },
              longTerm: {
                description: 'Analysis pending...',
                confidence: 0,
                potentialRisks: []
              }
            }
          };
        });

        console.log('Processed articles:', processed);
        setProcessedArticles(processed);
        setError(null);
      } catch (err) {
        console.error('Error processing articles:', err);
        setError(err instanceof Error ? err : new Error('Failed to process articles'));
      } finally {
        setLoading(false);
      }
    };

    if (articles.length > 0) {
      processArticles();
    }
  }, [articles]);

  return { processedArticles, loading, error };
}