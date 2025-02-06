import React, { useEffect, useState } from 'react';
import { Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import { ProcessedNews } from '../../services/news/processor';
import { RelatedArticle, findSimilarArticles } from '../../services/analysis/relationships';

interface NewsInsightsProps {
  news: ProcessedNews;
  articleId: number;
  title: string;
}

export const NewsInsights: React.FC<NewsInsightsProps> = ({ news, articleId, title }) => {
  const { analysis } = news;
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInsights() {
      setLoading(true);
      try {
        const similar = await findSimilarArticles(articleId);
        setRelatedArticles(similar);
      } catch (error) {
        console.error('Failed to load insights:', error);
      } finally {
        setLoading(false);
      }
    }

    loadInsights();
  }, [articleId]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Research Insights</h3>
      
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-medium text-gray-700 mb-2">Related Articles</h4>
            {relatedArticles.length > 0 ? (
              <ul className="space-y-3">
                {relatedArticles.map((article) => (
                  <li key={article.id} className="border-l-4 pl-4" style={{
                    borderColor: article.sentiment_label === 'positive' ? '#10B981' 
                      : article.sentiment_label === 'negative' ? '#EF4444' 
                      : '#6B7280'
                  }}>
                    <h5 className="font-medium text-gray-800">{article.title}</h5>
                    <p className="text-sm text-gray-600 mt-1">{article.summary}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Similarity: {(article.similarity * 100).toFixed(1)}%</span>
                      <span>{new Date(article.published_at).toLocaleDateString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No related articles found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};