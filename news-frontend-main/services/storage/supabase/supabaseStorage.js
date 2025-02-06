// src/services/storage/supabase/supabaseStorage.js
import { createClient } from '@supabase/supabase-js';
import logger from '../../../logger.js';

class SupabaseStorage {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  ensureDate(dateInput) {
    if (dateInput instanceof Date) {
      return dateInput;
    }
    return new Date(dateInput);
  }

  async storeArticle(article) {
    try {
      const articleData = {
        title: article.title,
        content: article.content,
        url: article.url,
        published_at: this.ensureDate(article.publishedAt),
        source: article.source || 'Trading Economics',
        category: article.category,
        sentiment_score: article.sentiment?.score,
        sentiment_label: article.sentiment?.label,
        raw_data: article
      };

      const { data, error } = await this.supabase
        .from('articles')
        .upsert(articleData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to store article:', error);
      throw error;
    }
  }

  async storeArticles(articles) {
    try {
      // Remove duplicates from the input array based on URL
      const uniqueArticles = Array.from(
        new Map(articles.map(article => [article.url, article])).values()
      );

      const articlesData = uniqueArticles.map(article => ({
        title: article.title,
        content: article.content,
        url: article.url,
        published_at: this.ensureDate(article.publishedAt),
        source: article.source || 'Trading Economics',
        category: article.category,
        sentiment_score: article.sentiment?.score,
        sentiment_label: article.sentiment?.label,
        raw_data: article
      }));

      const { data, error } = await this.supabase
        .from('articles')
        .upsert(articlesData, {
          onConflict: 'url',
          ignoreDuplicates: true // Changed to true to ignore duplicates
        })
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to store articles:', error);
      throw error;
    }
  }

  async getRecentArticles(limit = 100) {
    const { data, error } = await this.supabase
      .from('articles')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getArticlesByCategory(category) {
    try {
      const { data, error } = await this.supabase
        .from('articles')
        .select('*')
        .eq('category', category)
        .order('published_at', { ascending: false });

      if (error) throw error;
      if (!data?.length) {
        logger.warn(`No articles found for category: ${category}`);
      }
      return data || [];
    } catch (error) {
      logger.error(`Failed to get articles for category ${category}:`, error);
      throw error;
    }
  }

  async searchArticles(query) {
    try {
      const { data, error } = await this.supabase
        .from('articles')
        .select('*')
        .textSearch('content', query)
        .order('published_at', { ascending: false });

      if (error) throw error;
      if (!data?.length) {
        logger.warn(`No articles found for search term: ${query}`);
      }
      return data || [];
    } catch (error) {
      logger.error(`Failed to search articles with query ${query}:`, error);
      throw error;
    }
  }

  async getArticleById(id) {
    const { data, error } = await this.supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async deleteArticle(where) {
    const { error } = await this.supabase
      .from('articles')
      .delete()
      .eq('url', where.url);

    if (error) throw error;
  }

  async getCategories() {
    try {
      const { data, error } = await this.supabase
        .from('articles')
        .select('category');

      if (error) throw error;

      const categories = data.map(article => article.category);
      return [...new Set(categories)].filter(Boolean);
    } catch (error) {
      logger.error('Failed to fetch categories:', error);
      throw error;
    }
  }

  async getSampleArticle() {
    try {
      const { data, error } = await this.supabase
        .from('articles')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get sample article:', error);
      throw error;
    }
  }
}

export default SupabaseStorage; // Default export