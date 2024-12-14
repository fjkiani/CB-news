import React from 'react';
import { Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import { ProcessedNews } from '../../services/news/processor';

interface NewsInsightsProps {
  news: ProcessedNews;
}

export const NewsInsights: React.FC<NewsInsightsProps> = ({ news }) => {
  const { analysis } = news;
  
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-yellow-500 mt-1" />
        <div>
          <h4 className="font-semibold text-sm">Key Points</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
            {analysis.keyPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <TrendingUp className="w-5 h-5 text-blue-500 mt-1" />
        <div>
          <h4 className="font-semibold text-sm">Market Impact</h4>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Short-term:</span> {analysis.marketImpact.immediate}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Long-term:</span> {analysis.marketImpact.longTerm}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-500 mt-1" />
        <div>
          <h4 className="font-semibold text-sm">Related Indicators</h4>
          <div className="flex flex-wrap gap-2 mt-1">
            {analysis.relatedIndicators.map((indicator, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {indicator}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};