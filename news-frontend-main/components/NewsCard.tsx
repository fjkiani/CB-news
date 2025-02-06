import React, { useState } from 'react';
import { NewsArticle } from '../api/types';
import { NewsAnalysis } from './NewsAnalysis';
import '../styles/NewsCard.css';

interface NewsCardProps {
  article: NewsArticle;
}

export const NewsCard: React.FC<NewsCardProps> = ({ article }) => {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const formattedDate = new Date(article.publishedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZone: 'EST'
  });

  return (
    <div className="news-card">
      <div className="news-card-header">
        <h2>{article.title}</h2>
        <div className="news-metadata">
          <span className="news-date">
            <i className="far fa-clock"></i> {formattedDate}
          </span>
          <span className="news-source">{article.source}</span>
        </div>
      </div>

      <div className="news-content">
        <p>{article.content}</p>
        {article.url && (
          <a 
            href={article.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="read-more"
          >
            Read full article <i className="fas fa-external-link-alt"></i>
          </a>
        )}
      </div>

      <div className="news-actions">
        <button 
          className={`analysis-toggle ${showAnalysis ? 'active' : ''}`}
          onClick={() => setShowAnalysis(!showAnalysis)}
        >
          {showAnalysis ? 'Hide Analysis' : 'Show Analysis'}
          <i className={`fas fa-chevron-${showAnalysis ? 'up' : 'down'}`}></i>
        </button>
      </div>

      {showAnalysis && <NewsAnalysis article={article} />}
    </div>
  );
}; 