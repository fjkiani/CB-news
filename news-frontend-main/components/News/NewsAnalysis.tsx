import React from 'react';
import { ProcessedArticle } from '../../services/news/types';
import { useNewsAnalysis } from '../../hooks/useNewsAnalysis';

interface NewsAnalysisProps {
  article: ProcessedArticle;
  onClose: () => void;
}

export const NewsAnalysis: React.FC<NewsAnalysisProps> = ({ article, onClose }) => {
  const { analysis, loading, error } = useNewsAnalysis(article);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 bg-blue-50 p-4 rounded-md">
        <div className="h-4 bg-blue-100 rounded w-3/4"></div>
        <div className="h-4 bg-blue-100 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 p-4 rounded-md">
        <p className="text-yellow-800">Failed to load analysis: {error.message}</p>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
        <p className="text-blue-800">{analysis.summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-md">
          <h4 className="font-medium text-green-900 mb-2">Short-term Impact</h4>
          <p className="text-green-800">{analysis.marketImpact.immediate}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-md">
          <h4 className="font-medium text-purple-900 mb-2">Long-term Impact</h4>
          <p className="text-purple-800">{analysis.marketImpact.longTerm}</p>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-md">
        <h4 className="font-medium text-blue-900 mb-2">Key Points</h4>
        <ul className="list-disc list-inside space-y-1">
          {analysis.keyPoints.map((point, i) => (
            <li key={i} className="text-blue-800">{point}</li>
          ))}
        </ul>
      </div>

      {analysis.marketImpact.affectedSectors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {analysis.marketImpact.affectedSectors.map((sector, i) => (
            <span key={i} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
              {sector}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}; 