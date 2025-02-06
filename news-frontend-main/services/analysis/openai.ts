import { RedisCacheManager } from '../cache/redisCacheManager';
import { callDeepSeek } from './deepseek';

const cache = new RedisCacheManager('deepseek-analysis');

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

interface AnalysisResult {
  summary: string;
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
  marketImpact: {
    shortTerm: string;
    longTerm: string;
    affectedSectors: string[];
  };
}

export const analyzeNewsArticle = async (
  article: string,
  marketContext: string
): Promise<AnalysisResult> => {
  const cacheKey = JSON.stringify({ article, marketContext });
  
  const cached = await cache.get<AnalysisResult>(cacheKey);
  if (cached) return cached;

  const result = await callDeepSeek([
    {
      role: 'system',
      content: 'You are a financial analyst expert. Analyze the provided news article and market context.',
    },
    {
      role: 'user',
      content: `
        Article: ${article}
        Market Context: ${marketContext}
        
        Please provide:
        1. A concise summary
        2. Sentiment analysis
        3. Potential market impact (short-term and long-term)
        4. Affected market sectors
        
        Format the response as JSON.
      `,
    },
  ]);
  
  const parsedResult = JSON.parse(result);
  await cache.set(cacheKey, parsedResult);
  
  return parsedResult;
};