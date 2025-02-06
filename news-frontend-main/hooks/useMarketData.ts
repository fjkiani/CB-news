import { useState, useEffect } from 'react';
import { MarketData } from '../api/types';
import { fetchStockData } from '../api/alphavantage';

export const useMarketData = (symbols: string[]) => {
  const [data, setData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const promises = symbols.map(symbol => fetchStockData(symbol));
        const results = await Promise.all(promises);
        setData(results);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch market data'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [symbols]);

  return { data, loading, error };
};