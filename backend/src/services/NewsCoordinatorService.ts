import { ILogger } from '../types/logger';
import { DiffbotService, DiffbotResponse } from './diffbot';
import { CacheService } from './cache/CacheService';
import { ChangeDetectionService } from './monitoring';

// Update to use DiffbotResponse type instead of custom NewsAnalysisResult
type NewsAnalysisResult = DiffbotResponse;

interface ChangeDetectionResult {
  hasChanged: boolean;
  currentUrl?: string;
}

interface INewsCoordinatorService {
  processNews(): Promise<NewsAnalysisResult | null>;
}

export class NewsCoordinatorService implements INewsCoordinatorService {
  private changeDetection: ChangeDetectionService;
  private diffbot: DiffbotService;
  private cache: CacheService;
  private logger: ILogger;
  private readonly CACHE_KEY = 'latest_news_analysis';
  private readonly CACHE_TTL = 3600; // 1 hour in seconds

  constructor(
    changeDetection: ChangeDetectionService,
    diffbot: DiffbotService,
    cache: CacheService,
    logger: ILogger
  ) {
    this.changeDetection = changeDetection;
    this.diffbot = diffbot;
    this.cache = cache;
    this.logger = logger;
  }

  async processNews(): Promise<NewsAnalysisResult | null> {
    try {
      // Check for changes
      const { hasChanged, currentUrl }: ChangeDetectionResult = 
        await this.changeDetection.checkForChanges();

      if (hasChanged && currentUrl) {
        this.logger.info('New content detected, processing with Diffbot');
        const diffbotResult = await this.diffbot.analyze(currentUrl);
        
        // Cache the processed result
        await this.cache.set(this.CACHE_KEY, diffbotResult, this.CACHE_TTL);
        return diffbotResult;
      }

      // Return cached analysis if available
      const cached = await this.cache.get<NewsAnalysisResult>(this.CACHE_KEY);
      if (cached) {
        this.logger.info('Returning cached analysis');
        return cached;
      }

      this.logger.info('No new content and no cache available');
      return null;
      
    } catch (error) {
      this.logger.error('News processing failed:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
} 