import React, { useMemo } from 'react';
import { ProcessedArticle } from '../../services/news/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SentimentOverviewProps {
  articles: ProcessedArticle[];
}

export const SentimentOverview: React.FC<SentimentOverviewProps> = ({ articles }) => {
  const sentiment = useMemo(() => {
    if (articles.length === 0) return { score: 0, confidence: 0 };
    
    const totalScore = articles.reduce((sum, article) => sum + article.sentiment.score, 0);
    const totalConfidence = articles.reduce((sum, article) => sum + article.sentiment.confidence, 0);
    
    return {
      score: totalScore / articles.length,
      confidence: totalConfidence / articles.length,
    };
  }, [articles]);

  const getSentimentIcon = () => {
    if (sentiment.score > 0.2) return <TrendingUp className="w-6 h-6 text-green-600" />;
    if (sentiment.score < -0.2) return <TrendingDown className="w-6 h-6 text-red-600" />;
    return <Minus className="w-6 h-6 text-gray-600" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">Market Sentiment</h2>
      <div className="flex items-center justify-between mb-4">
        {getSentimentIcon()}
        <div className="text-2xl font-bold">
          {(sentiment.score * 100).toFixed(1)}%
        </div>
      </div>
      <div className="h-2 bg-gray-200 rounded-full mb-2">
        <div
          className="h-2 rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${sentiment.confidence * 100}%` }}
        ></div>
      </div>
      <div className="text-sm text-gray-600">
        Confidence: {(sentiment.confidence * 100).toFixed(1)}%
      </div>
    </div>
  );
};