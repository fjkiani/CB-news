import React from 'react';
import { LineChart } from 'lucide-react';
import { SentimentChart } from '../Charts/SentimentChart';

interface SentimentTrend {
  date: string;
  sentiment: number;
  confidence: number;
}

interface SentimentTrendsProps {
  trends: SentimentTrend[];
}

export const SentimentTrends: React.FC<SentimentTrendsProps> = ({ trends }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <LineChart className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Sentiment Trends</h2>
      </div>
      <div className="h-64">
        <SentimentChart data={trends} />
      </div>
    </div>
  );
};