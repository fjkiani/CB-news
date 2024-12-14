import React, { useState, useEffect } from 'react';
import { ProcessedArticle } from '../../services/news/types';
import { Clock, ExternalLink, TrendingUp, TrendingDown, Minus, Tag, BookOpen } from 'lucide-react';
import { analyzeMarketImpact } from '../../services/analysis/marketImpactAnalyzer';

interface NewsCardProps {
  article: ProcessedArticle;
}

export const NewsCard: React.FC<NewsCardProps> = ({ article }) => {
  const [marketImpact, setMarketImpact] = useState<{
    shortTerm: {
      description: string;
      confidence: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getMarketImpact = async () => {
      try {
        setLoading(true);
        setError(null);
        const impact = await analyzeMarketImpact(article.raw.content);
        setMarketImpact(impact);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze market impact');
      } finally {
        setLoading(false);
      }
    };

    if (article.raw.content) {
      getMarketImpact();
    }
  }, [article.raw.content]);

  const getSentimentIcon = () => {
    if (article.sentiment.score > 0.2) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (article.sentiment.score < -0.2) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold mb-2">{article.raw.title}</h3>
      
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{new Date(article.raw.publishedAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1">
          {getSentimentIcon()}
          <span>
            Sentiment: {(article.sentiment.score * 100).toFixed(1)}%
            ({article.sentiment.confidence * 100}% confidence)
          </span>
        </div>
      </div>

      {/* Diffbot AI Summary */}
      {article.raw.summary && (
        <div className="bg-gray-50 rounded-md p-4 mb-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="font-medium">AI Summary</span>
          </div>
          <p className="text-gray-600 text-sm">{article.raw.summary}</p>
        </div>
      )}

      {/* Original summary */}
      <p className="text-gray-700 mb-4">{article.summary}</p>

      {/* Diffbot Tags */}
      {article.raw.tags && article.raw.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <Tag className="w-4 h-4" />
            <span className="font-medium">Topics</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {article.raw.tags.map((tag, i) => (
              <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Existing entities */}
      <div className="space-y-2 mb-4">
        <div className="flex flex-wrap gap-2">
          {article.entities.companies.map((company, i) => (
            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {company}
            </span>
          ))}
          {article.entities.sectors.map((sector, i) => (
            <span key={i} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              {sector}
            </span>
          ))}
        </div>
      </div>

      {/* Market Impact Analysis */}
      <div className="bg-gray-50 rounded-md p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-700">Market Impact</span>
        </div>
        
        {loading ? (
          <div className="animate-pulse h-20 bg-gray-200 rounded" />
        ) : error ? (
          <div className="text-red-600 text-sm">
            {error}
          </div>
        ) : marketImpact ? (
          <>
            <p className="text-gray-600 text-sm mb-2">
              {marketImpact.shortTerm.description}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Confidence: {(marketImpact.shortTerm.confidence * 100).toFixed(1)}%</span>
            </div>
          </>
        ) : (
          <p className="text-gray-600 text-sm">
            No market impact analysis available
          </p>
        )}
      </div>

      {/* Read more link */}
      <a href={article.raw.url} target="_blank" rel="noopener noreferrer" 
         className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
        Read full article <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
};