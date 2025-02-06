import React from 'react';
import { useNewsAnalysis } from '../hooks/useNewsAnalysis';
import { NewsArticle } from '../api/types';
import '../styles/NewsAnalysis.css';

interface NewsAnalysisProps {
  article: NewsArticle;
}

export const NewsAnalysis: React.FC<NewsAnalysisProps> = ({ article }) => {
  const { analysis, loading, error } = useNewsAnalysis([article]);

  if (loading) return <div className="news-analysis loading">Analyzing article...</div>;
  if (error) return <div className="news-analysis error">Error analyzing article: {error.message}</div>;

  const articleAnalysis = analysis[article.id];
  if (!articleAnalysis) return null;

  const sentimentClass = `sentiment ${articleAnalysis.sentiment.label}`;
  const sentimentScore = (articleAnalysis.sentiment.score * 100).toFixed(1);

  return (
    <div className="news-analysis">
      <h3>AI Analysis</h3>
      
      <div className="summary">
        <h4>Key Points</h4>
        <p>{articleAnalysis.summary}</p>
      </div>

      <div className={sentimentClass}>
        <h4>Market Sentiment</h4>
        <p>
          <strong>{articleAnalysis.sentiment.label.toUpperCase()}</strong>
          <br />
          Score: {sentimentScore}%
          <br />
          Confidence: {articleAnalysis.sentiment.confidence.toFixed(1)}%
        </p>
      </div>

      <div className="market-impact">
        <h4>Market Impact Analysis</h4>
        <div className="impact-section">
          <strong>Short Term (1-7 days):</strong>
          <p>{articleAnalysis.marketImpact.shortTerm}</p>
        </div>
        <div className="impact-section">
          <strong>Long Term (1-6 months):</strong>
          <p>{articleAnalysis.marketImpact.longTerm}</p>
        </div>
        {articleAnalysis.marketImpact.affectedSectors.length > 0 && (
          <div className="impact-section">
            <strong>Affected Sectors:</strong>
            <ul>
              {articleAnalysis.marketImpact.affectedSectors.map((sector: string) => (
                <li key={sector}>{sector}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}; 