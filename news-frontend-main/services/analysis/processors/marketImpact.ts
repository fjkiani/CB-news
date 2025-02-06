interface MarketImpact {
  shortTerm: {
    description: string;
    confidence: number;
    affectedSectors: string[];
  };
  longTerm: {
    description: string;
    confidence: number;
    potentialRisks: string[];
  };
}

import { RedisCacheManager } from '../../cache/redisCacheManager';
import { callDeepSeek } from '../deepseek';

const cache = new RedisCacheManager('market-impact');

export async function analyzeMarketImpact(
  article: string,
  marketContext: string
): Promise<MarketImpact> {
  const cacheKey = JSON.stringify({ article, marketContext });
  
  // Try cache first
  const cached = await cache.get<MarketImpact>(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await callDeepSeek([
    {
      role: 'system',
      content: 'Analyze the potential market impact of the news article considering the current market context.',
    },
    {
      role: 'user',
      content: `
        Article: ${article}
        Market Context: ${marketContext}
        
        Analyze:
        1. Short-term impact (1-7 days)
        2. Long-term impact (1-6 months)
        3. Affected sectors
        4. Potential risks
        
        Provide confidence levels for predictions.
      `,
    },
  ], 0.4);
  
  const parsedResult = JSON.parse(result);
  
  // Cache the result
  await cache.set(cacheKey, parsedResult);
  
  return parsedResult;
}