import { BACKEND_CONFIG } from './config';
import { retry } from '../../utils/retry';
import type { ScraperError } from './types';

class BackendAPI {
  private baseUrl: string;
  private static instance: BackendAPI;

  private constructor() {
    // Force production URL for now to debug
    this.baseUrl = 'https://backend-khaki-omega.vercel.app';
    console.log('BackendAPI initialized with URL:', this.baseUrl);
  }

  static getInstance() {
    if (!BackendAPI.instance) {
      BackendAPI.instance = new BackendAPI();
    }
    return BackendAPI.instance;
  }

  async getRecentArticles() {
    const url = `${this.baseUrl}/api/news`;
    console.log('Fetching news from:', url);

    try {
      const response = await retry(
        async () => {
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          // Check response before returning
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res;
        },
        {
          attempts: 3,
          delay: 1000,
          onError: (error, attempt) => {
            console.warn(`Attempt ${attempt} failed:`, error.message);
          }
        }
      );

      const data = await response.json();
      console.log('Successfully fetched articles:', data.length);
      return data;
    } catch (error) {
      console.error('Failed to fetch news:', error);
      throw new Error(`Failed to fetch news: ${error.message}`);
    }
  }
}

export const backendAPI = BackendAPI.getInstance();