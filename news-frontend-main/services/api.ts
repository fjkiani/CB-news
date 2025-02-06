import { supabase } from './supabase/client';
import type { RawNewsArticle } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class BackendAPI {
  private async handleSupabaseError(error: any): Promise<never> {
    console.error('Supabase error:', error);
    if (error.message?.includes('Invalid API key')) {
      // Try to refresh the session
      const { data: { session }, error: refreshError } = await supabase.auth.getSession();
      if (refreshError || !session) {
        throw new Error('Authentication failed. Please try logging in again.');
      }
    }
    throw error;
  }

  async getRecentArticles(): Promise<RawNewsArticle[]> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(100);

      if (error) {
        return this.handleSupabaseError(error);
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get recent articles:', error);
      throw error;
    }
  }

  async getLatestNews(forceFresh = false): Promise<RawNewsArticle[]> {
    try {
      const response = await fetch(`${API_URL}/api/scrape/trading-economics${forceFresh ? '?fresh=true' : ''}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.getSession()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch latest news:', error);
      // Fallback to recent articles if scraping fails
      return this.getRecentArticles();
    }
  }
}

export const backendAPI = new BackendAPI(); 