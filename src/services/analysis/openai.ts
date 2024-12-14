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
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
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
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze article');
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
};