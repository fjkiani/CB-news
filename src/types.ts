export interface RawNewsArticle {
  id?: string;
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  source: string;
  category?: string;
  sentiment?: {
    score: number;
    label: string;
    confidence: number;
  };
  summary?: string;
  author?: string;
  tags?: string[];
}

export interface NewsState {
  news: RawNewsArticle[];
  loading: boolean;
  error: Error | null;
}

export interface BackendStatus {
  status: 'ok' | 'error';
  timestamp: string;
  env?: {
    hasSupabaseUrl: boolean;
    hasSupabaseKey: boolean;
    hasDiffbotToken: boolean;
    hasRedisUrl: boolean;
  };
}

export interface ScraperError extends Error {
  code?: string;
  response?: any;
} 