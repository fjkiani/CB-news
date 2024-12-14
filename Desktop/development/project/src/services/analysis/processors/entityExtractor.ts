interface Entity {
  name: string;
  type: 'company' | 'sector' | 'indicator';
  confidence: number;
}

export async function extractEntities(text: string): Promise<Entity[]> {
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
          content: 'Extract and classify entities from the financial text. Focus on companies, market sectors, and economic indicators.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to extract entities');
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}