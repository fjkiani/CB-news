export interface Article {
  title: string;
  content: string;
  url: string;
  publishedAt: string | null;
  published_at: string | null;
  created_at: string;
  source: string;
  sentiment: {
    score: number;
    label: string;
    confidence: number;
  };
  summary?: string;
  author?: string;
  id: string;
  naturalLanguage?: {
    summary?: string;
    topics?: string[];
    keywords?: string[];
    categories?: string[];
  };
  tags?: Array<{
    label: string;
    score: number;
  }>;
  raw_data?: {
    id: string;
    url: string;
    tags?: Array<any>;
    title: string;
    author?: string;
    publishedAt?: string;
  };
}

export interface RawNewsArticle {
  id?: string;
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  created_at: string;
  source: string;
  summary?: string;
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