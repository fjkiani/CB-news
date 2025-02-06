import React from 'react';
import { NewsCard } from './NewsCard';
import { NewsArticle } from '../api/types';
import '../styles/NewsList.css';

interface NewsListProps {
  articles: NewsArticle[];
  loading?: boolean;
  error?: Error | null;
}

export const NewsList: React.FC<NewsListProps> = ({ 
  articles, 
  loading = false, 
  error = null 
}) => {
  if (loading) {
    return (
      <div className="news-list-loading">
        <div className="loader"></div>
        <p>Loading news articles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="news-list-error">
        <i className="fas fa-exclamation-circle"></i>
        <p>Error loading news: {error.message}</p>
      </div>
    );
  }

  if (!articles.length) {
    return (
      <div className="news-list-empty">
        <i className="far fa-newspaper"></i>
        <p>No news articles available</p>
      </div>
    );
  }

  return (
    <div className="news-list">
      {articles.map(article => (
        <NewsCard key={article.id} article={article} />
      ))}
    </div>
  );
}; 