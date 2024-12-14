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
  publishedAt: string;
  source: string;
  summary?: string;
  tags?: string[];
  entities?: {
    name: string;
    type: string;
    confidence: number;
  }[];
  nlp?: {
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