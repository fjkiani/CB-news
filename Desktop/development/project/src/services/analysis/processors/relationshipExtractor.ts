interface MarketRelationship {
  source: string;
  target: string;
  type: 'correlation' | 'causation' | 'dependency';
  strength: number;
  description: string;
}

export async function extractRelationships(
  articles: string[],
  timeframe: string
): Promise<MarketRelationship[]> {
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
          content: 'Analyze the relationships between different market entities, events, and indicators mentioned in the articles.',
        },
        {
          role: 'user',
          content: `
            Articles: ${JSON.stringify(articles)}
            Timeframe: ${timeframe}
            
            Extract:
            1. Direct relationships between entities
            2. Causal relationships between events
            3. Dependencies between indicators
            
            Provide relationship strength and confidence levels.
          `,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to extract relationships');
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}