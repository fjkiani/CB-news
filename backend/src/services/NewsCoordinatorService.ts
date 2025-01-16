import { ILogger } from '../types/logger';
import { DiffbotService, DiffbotResponse } from './diffbot';
import { CacheService } from './redis/CacheService';
import { ChangeDetectionService, ChangeDetectionResult } from './monitoring';
import { SupabaseStorage } from './storage/supabase/supabaseStorage';

interface NewsArticle {
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  source: string;
  category: string;
  sentiment: {
    score: number;
    label: string;
    confidence: number;
  };
  summary: string;
  author: string;
  id: string;
}

interface ProcessedNewsResult {
  newArticles: NewsArticle[];
  totalProcessed: number;
  cached: boolean;
}

interface INewsCoordinatorService {
  processNews(): Promise<ProcessedNewsResult>;
}

export class NewsCoordinatorService implements INewsCoordinatorService {
  private changeDetection: ChangeDetectionService;
  private diffbot: DiffbotService;
  private cache: CacheService;
  private storage: SupabaseStorage;
  private logger: ILogger;
  private readonly CACHE_KEY = 'processed_articles';
  private readonly CACHE_TTL = 300; // 5 minutes in seconds

  constructor(
    changeDetection: ChangeDetectionService,
    diffbot: DiffbotService,
    cache: CacheService,
    storage: SupabaseStorage,
    logger: ILogger
  ) {
    this.changeDetection = changeDetection;
    this.diffbot = diffbot;
    this.cache = cache;
    this.storage = storage;
    this.logger = logger;
  }

  async processNews(): Promise<ProcessedNewsResult> {
    try {
      // First check cache
      const cachedArticles = await this.cache.get<NewsArticle[]>(this.CACHE_KEY);
      if (cachedArticles) {
        this.logger.info('Returning cached articles', { count: cachedArticles.length });
        return {
          newArticles: cachedArticles,
          totalProcessed: cachedArticles.length,
          cached: true
        };
      }

      // Check for changes
      const changeResult = await this.changeDetection.checkForChanges();
      
      if (!changeResult.hasChanged || !changeResult.articles) {
        this.logger.info('No new content detected');
        return {
          newArticles: [],
          totalProcessed: 0,
          cached: false
        };
      }

      // Get existing articles from Supabase for comparison
      const existingArticles = await this.storage.getRecentArticles();
      const existingUrls = new Set(existingArticles.map(a => a.url));

      // Process new articles
      const newArticles: NewsArticle[] = [];
      
      for (const article of changeResult.articles) {
        // Skip if we already have this article
        if (existingUrls.has(article.url)) {
          this.logger.debug('Skipping existing article', { url: article.url });
          continue;
        }

        // Get full article details from Diffbot
        const diffbotResult = await this.diffbot.analyze(article.url);
        
        if (diffbotResult.objects && diffbotResult.objects.length > 0) {
          const processedArticle = this.processArticle(diffbotResult.objects[0], article);
          newArticles.push(processedArticle);
        }
      }

      // Store new articles in Supabase
      if (newArticles.length > 0) {
        await this.storage.storeArticles(newArticles);
        this.logger.info('Stored new articles', { count: newArticles.length });

        // Update cache with all articles (new + existing)
        const allArticles = [...newArticles, ...existingArticles];
        await this.cache.set(this.CACHE_KEY, allArticles, this.CACHE_TTL);
      }

      return {
        newArticles,
        totalProcessed: changeResult.articles.length,
        cached: false
      };

    } catch (error) {
      this.logger.error('News processing failed:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private processArticle(diffbotObject: any, originalArticle: { title: string; url: string; publishedAt: string }): NewsArticle {
    return {
      title: diffbotObject.title || originalArticle.title,
      content: diffbotObject.text || '',
      url: diffbotObject.pageUrl || originalArticle.url,
      publishedAt: diffbotObject.date || originalArticle.publishedAt,
      source: 'Trading Economics',
      category: this.extractCategory(diffbotObject, originalArticle.url),
      sentiment: {
        score: diffbotObject.sentiment || 0,
        label: this.getSentimentLabel(diffbotObject.sentiment || 0),
        confidence: Math.abs(diffbotObject.sentiment || 0)
      },
      summary: diffbotObject.text || '',
      author: diffbotObject.author || 'Trading Economics',
      id: this.generateArticleId(originalArticle.title, originalArticle.url)
    };
  }

  private extractCategory(diffbotObject: any, url: string): string {
    try {
      const urlParams = new URL(url).searchParams;
      if (urlParams.has('i')) {
        return urlParams.get('i') || 'General';
      }
      if (diffbotObject.title?.toLowerCase().includes('market')) {
        return 'Markets';
      }
      if (diffbotObject.title?.toLowerCase().includes('economic')) {
        return 'Economic';
      }
      return 'General';
    } catch {
      return 'General';
    }
  }

  private getSentimentLabel(score: number): string {
    if (score >= 0.5) return 'positive';
    if (score <= -0.5) return 'negative';
    return 'neutral';
  }

  private generateArticleId(title: string, url: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(`${url}${title}`).digest('hex');
    return `te-${hash}`;
  }
} 