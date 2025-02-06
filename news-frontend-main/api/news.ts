import { NewsArticle } from './types';

const DIFFBOT_TOKEN = import.meta.env.VITE_DIFFBOT_TOKEN;
const DIFFBOT_API_URL = 'https://api.diffbot.com/v3/article';
const API_URL = 'https://backend-khaki-omega.vercel.app';

export const fetchLatestNews = async (): Promise<NewsArticle[]> => {
  console.log('Fetching from:', `${API_URL}/api/news`);
  
  try {
    const response = await fetch(`${API_URL}/api/news/recent`);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error response:', errorData);
      throw new Error(`Failed to fetch latest news: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received data:', data);
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

export const fetchNews = async (url: string): Promise<NewsArticle> => {
  const response = await fetch(
    `${DIFFBOT_API_URL}?token=${DIFFBOT_TOKEN}&url=${encodeURIComponent(url)}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch news data');
  }

  const data = await response.json();
  const article = data.objects[0];

  return {
    id: article.pageUrl,
    title: article.title,
    content: article.text,
    publishedAt: article.date,
    source: article.siteName,
    url: article.pageUrl,
  };
};