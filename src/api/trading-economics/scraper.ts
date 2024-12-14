import { NewsArticle } from '../types';
import { JSDOM } from 'jsdom';

const TRADING_ECONOMICS_URL = 'https://tradingeconomics.com/stream?c=united+states';

export async function scrapeNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetch(TRADING_ECONOMICS_URL);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const newsItems = document.querySelectorAll('.stream-item');
    return Array.from(newsItems).map((item): NewsArticle => {
      const title = item.querySelector('.title')?.textContent?.trim() || '';
      const content = item.querySelector('.description')?.textContent?.trim() || '';
      const timestamp = item.querySelector('.date')?.getAttribute('data-value') || new Date().toISOString();
      
      return {
        id: `te-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title,
        content,
        publishedAt: timestamp,
        source: 'Trading Economics',
        url: TRADING_ECONOMICS_URL,
      };
    });
  } catch (error) {
    console.error('Error scraping Trading Economics:', error);
    return [];
  }
}