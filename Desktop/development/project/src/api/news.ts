import { NewsArticle } from './types';

const DIFFBOT_TOKEN = import.meta.env.VITE_DIFFBOT_TOKEN;
const DIFFBOT_API_URL = 'https://api.diffbot.com/v3/article';

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