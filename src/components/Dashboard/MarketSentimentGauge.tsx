import React from 'react';
import { Gauge } from 'lucide-react';

interface MarketSentimentGaugeProps {
  sentiment: number;
  confidence: number;
}

export const MarketSentimentGauge: React.FC<MarketSentimentGaugeProps> = ({
  sentiment,
  confidence
}) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <Gauge className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Market Sentiment</h2>
      </div>
      <div className="relative h-32 flex items-center justify-center">
        {/* Implement gauge visualization */}
      </div>
      <div className="text-sm text-gray-600 mt-2">
        Confidence: {(confidence * 100).toFixed(1)}%
      </div>
    </div>
  );
};