import { useState, useEffect } from 'react';
import { NewsArticle } from '../api/types';
import { analyzeNewsArticle } from '../services/analysis/openai';

export const useNewsAnalysis = (articles: NewsArticle[]) => {
  const [analysis, setAnalysis] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const analyzeArticles = async () => {
      try {
        setLoading(true);
        const results = await Promise.all(
          articles.map(article =>
            analyzeNewsArticle(article.content, 'Current market context')
          )
        );
        
        const analysisMap = articles.reduce((acc, article, index) => {
          acc[article.id] = results[index];
          return acc;
        }, {} as Record<string, any>);
        
        setAnalysis(analysisMap);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to analyze articles'));
      } finally {
        setLoading(false);
      }
    };

    if (articles.length > 0) {
      analyzeArticles();
    }
  }, [articles]);

  return { analysis, loading, error };
};