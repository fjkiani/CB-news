export interface ProcessedArticle {
  id: string;
  raw: {
    title: string;
    content: string;
    url: string;
    publishedAt: string;
    source?: string;
    naturalLanguage?: string;
    tags?: string[];
    created_at?: string;
  };
  summary?: string;
  keyPoints?: string[];
  entities?: {
    companies: string[];
    sectors: string[];
    indicators: string[];
  };
  sentiment?: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
  marketImpact?: {
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
  classification?: {
    type: string;
    importance: number;
  };
}

export interface DeepSeekAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  marketAnalysis: {
    overview: {
      summary: string;
      keyMetrics: string[];
    };
    catalysts: {
      primary: string;
      secondary: string[];
      context: string;
    };
    sectorImpacts: Array<{
      sector: string;
      impact: string;
      keyStocks: Array<{
        symbol: string;
        change: string;
        reason: string;
      }>;
    }>;
    tradingImplications: {
      shortTerm: {
        outlook: string;
        keyLevels: string[];
        tradingStrategy: string;
        risks: string[];
      };
      longTerm: {
        outlook: string;
        keyFactors: string[];
        investmentThesis: string;
      };
    };
  };
  confidence: number;
  source: string;
} 