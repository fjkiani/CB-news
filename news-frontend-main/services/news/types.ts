export interface NewsSource {
  id: string;
  name: string;
  url: string;
  category: 'market' | 'economic' | 'corporate';
}

export interface RawNewsArticle {
  title: string;
  content: string;
  url: string;
  publishedAt?: string;
  created_at?: string;
  date?: string;
  source: string;
  summary?: string;
  sentiment?: {
    score: number;
    label: string;
    confidence: number;
  };
  tags?: Array<{
    label: string;
    score: number;
  }>;
  entities?: {
    name: string;
    type: string;
    confidence: number;
  }[];
  naturalLanguage?: {
    summary?: string;
    topics?: string[];
    keywords?: string[];
    categories?: string[];
  };
  quotes?: {
    text: string;
    speaker?: string;
  }[];
}

export interface ProcessedArticle {
  id: string;
  raw: RawNewsArticle;
  summary: string;
  keyPoints: string[];
  entities: {
    companies: string[];
    sectors: string[];
    indicators: string[];
  };
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
  marketImpact: {
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
  };
}