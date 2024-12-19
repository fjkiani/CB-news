import { Request, Response } from 'express';
import { SupabaseStorage } from '../../services/storage/supabase/supabaseStorage';

export class NewsController {
  private storage: SupabaseStorage;

  constructor() {
    this.storage = new SupabaseStorage();
  }

  // Get recent news articles
  getRecentNews = async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const news = await this.storage.getRecentArticles(limit);
      res.json(news);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch news',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Get news by category
  getNewsByCategory = async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const news = await this.storage.getArticlesByCategory(category);
      res.json(news);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch category news',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Search news
  searchNews = async (req: Request, res: Response) => {
    try {
      const { query } = req.query;
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      const news = await this.storage.searchArticles(query as string);
      res.json(news);
    } catch (error) {
      res.status(500).json({ 
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Get single article
  getArticle = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const article = await this.storage.getArticleById(id);
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
      res.json(article);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch article',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
