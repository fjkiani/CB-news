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

export async function analyzeMarketImpact(
  article: string,
  marketContext: string
): Promise<MarketImpact> {
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
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze market impact');
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}