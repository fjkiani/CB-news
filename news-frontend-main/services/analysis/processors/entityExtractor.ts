interface Entity {
  name: string;
  type: 'company' | 'sector' | 'indicator';
  confidence: number;
}

import { RedisCacheManager } from '../../cache/redisCacheManager';
import { callDeepSeek } from '../deepseek';

const cache = new RedisCacheManager('entity-extractor');

export async function extractEntities(text: string): Promise<Entity[]> {
  const cached = await cache.get<Entity[]>(text);
  if (cached) return cached;

  const result = await callDeepSeek([
    {
      role: 'system',
      content: 'Extract and classify entities from the financial text. Focus on companies, market sectors, and economic indicators.',
    },
    {
      role: 'user',
      content: text,
    },
  ], 0.3);
  
  const parsedResult = JSON.parse(result);
  await cache.set(text, parsedResult);
  
  return parsedResult;
}