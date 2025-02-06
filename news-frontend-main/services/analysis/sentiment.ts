export interface SentimentAnalysis {
  score: number;
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export const analyzeSentiment = async (text: string): Promise<SentimentAnalysis> => {
  // TODO: Implement LLM integration
  return {
    score: 0,
    label: 'neutral',
    confidence: 0,
  };
};