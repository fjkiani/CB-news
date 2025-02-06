import { useState, useEffect } from 'react';
import { NewsArticle } from '../api/types';
import { analyzeNewsArticle } from '../services/analysis/deepseek';

export const useNewsAnalysis = (articles: NewsArticle[]) => {
  const [analysis, setAnalysis] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const analyzeArticles = async () => {
      if (!articles.length) return;
      
      try {
        setLoading(true);
        setError(null);

        // Process articles in batches to avoid rate limits
        const batchSize = 3;
        const results = [];
        
        for (let i = 0; i < articles.length; i += batchSize) {
          const batch = articles.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(article =>
              analyzeNewsArticle(
                article.content,
                `Current market context for ${article.title}`
              ).catch(err => {
                console.error(`Failed to analyze article: ${article.title}`, err);
                return null;
              })
            )
          );
          results.push(...batchResults);
          
          // Add a small delay between batches
          if (i + batchSize < articles.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        const analysisMap = articles.reduce((acc, article, index) => {
          if (results[index]) {
            acc[article.id] = results[index];
          }
          return acc;
        }, {} as Record<string, any>);
        
        setAnalysis(analysisMap);
      } catch (err) {
        console.error('Analysis error:', err);
        setError(err instanceof Error ? err : new Error('Failed to analyze articles'));
      } finally {
        setLoading(false);
      }
    };

    analyzeArticles();
  }, [articles]);

  return { analysis, loading, error };
};