import { NewsArticle } from '../../api/types';

interface RelationshipNode {
  id: string;
  type: 'asset' | 'event' | 'sector';
  name: string;
}

interface RelationshipEdge {
  source: string;
  target: string;
  strength: number;
  type: 'positive' | 'negative' | 'neutral';
}

export const extractRelationships = async (
  articles: NewsArticle[],
  marketData: any
): Promise<{ nodes: RelationshipNode[]; edges: RelationshipEdge[] }> => {
  // TODO: Implement relationship extraction using OpenAI
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Extract market relationships from the provided news articles and market data.',
        },
        {
          role: 'user',
          content: JSON.stringify({ articles, marketData }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to extract relationships');
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
};