export interface Article {
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  source: string;
  sentiment: {
    score: number;
    label: string;
    confidence: number;
  };
  author?: string;
  id: string;
} 