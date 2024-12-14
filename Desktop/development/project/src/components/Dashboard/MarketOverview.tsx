import React from 'react';
import { TrendingUp, DollarSign, BarChart } from 'lucide-react';
import { MarketData } from '../../api/types';

interface MarketOverviewProps {
  data: MarketData[];
  loading: boolean;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ data, loading }) => {
  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-200 rounded-lg"></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {data.map((item) => (
        <div key={item.symbol} className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">{item.symbol}</h3>
            </div>
            <span className={`flex items-center gap-1 ${
              item.change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {item.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <BarChart className="w-4 h-4" />}
              {item.changePercent.toFixed(2)}%
            </span>
          </div>
          <p className="text-2xl font-bold mt-2">${item.price.toFixed(2)}</p>
          <p className="text-sm text-gray-600 mt-1">
            Last updated: {new Date(item.timestamp).toLocaleTimeString()}
          </p>
        </div>
      ))}
    </div>
  );
};