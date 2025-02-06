export interface ProcessedArticle {
  id: string;
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  source: 'Trading Economics' | 'Investing11';
  category: string;
  sentiment: {
    score: number;
    label: string;
    confidence: number;
  };
  summary?: string;
  author?: string;
  tags?: string[];
  classification?: {
    importance: number;
  };
  importance?: number;
  needsAttention?: boolean;
  analysis?: {
    summary: string;
    keyPoints: string[];
    marketImpact: {
      shortTerm: string;
      longTerm: string;
    };
  };
} 