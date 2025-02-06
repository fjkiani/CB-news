export interface Article {
  id: string;
  title: string;
  content: string;
  url: string;
  published_at: Date;
  source: string;
  category: string | null;
  sentiment_score: number | null;
  sentiment_label: string | null;
  sentiment_confidence: number | null;
  embedding: number[] | null;
  summary: string | null;
  raw_data: any;
  created_at: Date;
  updated_at: Date;
}

export interface DatabaseArticle {
  id: string;
  title: string;
  content: string;
  url: string;
  published_at: Date;
  source: string;
  category?: string;
  sentiment_score?: number;
  sentiment_label?: string;
  raw_data?: any;
  created_at: Date;
  updated_at: Date;
}

export interface DatabaseArticleInsert extends Omit<DatabaseArticle, 'id' | 'created_at' | 'updated_at'> {
  published_at: Date;
}

export interface Database {
  public: {
    Tables: {
      articles: {
        Row: DatabaseArticle;
        Insert: DatabaseArticleInsert;
        Update: Partial<DatabaseArticleInsert>;
      };
    };
  };
}
