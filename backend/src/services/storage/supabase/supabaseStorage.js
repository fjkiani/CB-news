// src/services/storage/supabase/supabaseStorage.js
import { createClient } from '@supabase/supabase-js';
import logger from '../../../logger.js';

class SupabaseStorage {
  constructor() {
    // Try all possible environment variable combinations
    const supabaseUrl = 
      process.env.VITE_SUPABASE_URL || 
      process.env.SUPABASE_URL || 
      process.env.DB_URL;

    const supabaseKey = 
      process.env.VITE_SUPABASE_KEY || 
      process.env.SUPABASE_KEY || 
      process.env.SERVICE_KEY;

    // Debug environment variables
    logger.info('Supabase environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlStart: supabaseUrl?.substring(0, 20) + '...',
      envKeys: Object.keys(process.env).filter(key => 
        key.includes('SUPABASE') || 
        key.includes('DB_') || 
        key.includes('SERVICE_') ||
        key.includes('VITE_')
      )
    });

    if (!supabaseUrl || !supabaseKey) {
      const error = new Error('Missing Supabase credentials');
      error.details = {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        envKeys: Object.keys(process.env)
      };
      throw error;
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      logger.info('SupabaseStorage initialized successfully');
    } catch (error) {
      logger.error('Failed to create Supabase client:', error);
      throw error;
    }
  }

  ensureDate(dateInput) {
    if (dateInput instanceof Date) {
      return dateInput;
    }
    return new Date(dateInput);
  }

  async storeArticle(article) {
    try {
      // Get the date from either publishedAt or date field
      const articleDate = article.publishedAt || article.date;
      
      const articleData = {
        title: article.title,
        content: article.content,
        url: article.url,
        published_at: this.ensureDate(articleDate),
        source: article.source || 'Trading Economics',
        category: article.category || 'Market News',
        sentiment_score: article.sentiment?.score || 0,
        sentiment_label: article.sentiment?.label || 'neutral',
        raw_data: article
      };

      logger.info('Storing article:', {
        title: articleData.title,
        url: articleData.url,
        date: articleDate
      });

      // First check if article exists
      const { data: existing } = await this.supabase
        .from('articles')
        .select('id')
        .eq('url', articleData.url)
        .single();

      if (existing) {
        // Update existing article
        const { data, error } = await this.supabase
          .from('articles')
          .update(articleData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new article
        const { data, error } = await this.supabase
          .from('articles')
          .insert(articleData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
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

      logger.info(`Processing ${uniqueArticles.length} unique articles`);

      const articlesData = uniqueArticles.map(article => {
        // Get the date from either publishedAt or date field
        const articleDate = article.publishedAt || article.date;
        
        return {
          title: article.title,
          content: article.content,
          url: article.url,
          published_at: this.ensureDate(articleDate),
          source: article.source || 'Trading Economics',
          category: article.category || 'Market News',
          sentiment_score: article.sentiment?.score || 0,
          sentiment_label: article.sentiment?.label || 'neutral',
          raw_data: article
        };
      });

      // Log the first article's date for debugging
      if (articlesData.length > 0) {
        logger.info('First article date:', {
          title: articlesData[0].title,
          date: articlesData[0].published_at,
          originalDate: uniqueArticles[0].date || uniqueArticles[0].publishedAt
        });
      }

      // Use upsert with explicit conflict handling
      const { data, error } = await this.supabase
        .from('articles')
        .upsert(articlesData, {
          onConflict: 'url',
          ignoreDuplicates: false // We want to update existing articles
        })
        .select();

      if (error) throw error;
      
      logger.info(`Successfully stored ${data?.length || 0} articles`);
      return data || [];
    } catch (error) {
      logger.error('Failed to store articles:', error);
      throw error;
    }
  }

  async getRecentArticles(limit = 100) {
    try {
      const { data, error } = await this.supabase
        .from('articles')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      // Transform data for frontend
      const transformedData = data?.map(article => ({
        ...article,
        publishedAt: article.published_at,
        created_at: article.created_at || article.published_at // Fallback to published_at if created_at is null
      })) || [];
      
      logger.info(`Retrieved ${transformedData.length} recent articles`);
      return transformedData;
    } catch (error) {
      logger.error('Failed to get recent articles:', error);
      throw error;
    }
  }
}

export { SupabaseStorage };
export default SupabaseStorage;