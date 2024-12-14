import { useState, useEffect } from 'react';
import { RawNewsArticle, ProcessedArticle } from '../services/news/types';

export function useNewsProcessor(articles: RawNewsArticle[]) {
  const [processedArticles, setProcessedArticles] = useState<ProcessedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const processArticles = async () => {
      try {
        setLoading(true);
        console.log('Processing articles:', articles);

        const processed = articles.map((article) => {
          const sentiment = {
            score: article.sentiment.score,
            label: article.sentiment.label,
            confidence: article.sentiment.confidence
          };

          return {
            id: `${article.source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            raw: article,
            summary: article.content.slice(0, 200) + '...',
            keyPoints: [article.content.slice(0, 100)],
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