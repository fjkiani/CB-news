export interface MarketEvent {
  date: string;
  title: string;
  importance: 'low' | 'medium' | 'high';
  category: string;
  description: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  source: string;
  url: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}