import React from 'react';
import { ProcessedArticle } from '../../services/news/types';
import { NewsCard } from './NewsCard';
import { Newspaper } from 'lucide-react';

interface NewsGridProps {
  articles: ProcessedArticle[];
  loading: boolean;
}

export const NewsGrid: React.FC<NewsGridProps> = ({ articles, loading }) => {
  if (loading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
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
    <div className="grid gap-4">
      {articles.map((article) => (
        <NewsCard key={article.id} article={article} />
      ))}
    </div>
  );
};