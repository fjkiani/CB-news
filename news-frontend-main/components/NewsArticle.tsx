import React from 'react';
import { NewsAnalysis } from './NewsAnalysis';
import { NewsArticle as NewsArticleType } from '../api/types';

interface NewsArticleProps {
  article: NewsArticleType;
}

export const NewsArticle: React.FC<NewsArticleProps> = ({ article }) => {
  return (
    <div className="news-article">
      <h2>{article.title}</h2>
      <div className="metadata">
        <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
        <span>{article.source}</span>
      </div>
      <div className="content">{article.content}</div>
      <NewsAnalysis article={article} />
    </div>
  );
}; 