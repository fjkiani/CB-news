import React from 'react';
import { NewsCard } from './NewsCard';
import { NewsArticle } from '../../api/types';
import { Newspaper } from 'lucide-react';

interface NewsFeedProps {
  articles: (NewsArticle & {
    sentiment?: {
      score: number;
      label: string;
    };
  })[];
  loading: boolean;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ articles, loading }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-48 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-8">
        <Newspaper className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No news articles available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold">Latest Market News</h2>
      </div>
      {articles.map((article) => (
        <NewsCard 
          key={article.id} 
          article={article}
          sentiment={article.sentiment}
        />
      ))}
    </div>
  );
};