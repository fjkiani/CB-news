import { ProcessedArticle } from '../news/types';
import { createClient } from '@supabase/supabase-js';
import { getEndpointUrl } from '../backend/config';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const API_URL = import.meta.env.VITE_SCRAPER_API_URL;

// Cache management with localStorage
class AnalysisCache {
  private static CACHE_KEY = 'news-analysis-cache';
  private static MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours
  private static MAX_CACHE_SIZE = 100;

  private static cache: Map<string, { timestamp: number; data: DeepSeekAnalysis }>;

  static {
    try {
      const stored = localStorage.getItem(AnalysisCache.CACHE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      AnalysisCache.cache = new Map(Object.entries(parsed));
      AnalysisCache.cleanup();
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
      AnalysisCache.cache = new Map();
    }
  }

  static get(key: string): DeepSeekAnalysis | null {
    const entry = AnalysisCache.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > AnalysisCache.MAX_CACHE_AGE) {
      AnalysisCache.cache.delete(key);
      AnalysisCache.saveToStorage();
      return null;
    }

    return entry.data;
  }

  static set(key: string, data: DeepSeekAnalysis): void {
    AnalysisCache.cache.set(key, {
      timestamp: Date.now(),
      data
    });

    if (AnalysisCache.cache.size > AnalysisCache.MAX_CACHE_SIZE) {
      const entries = Array.from(AnalysisCache.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      while (AnalysisCache.cache.size > AnalysisCache.MAX_CACHE_SIZE) {
        const [oldestKey] = entries.shift()!;
        AnalysisCache.cache.delete(oldestKey);
      }
    }

    AnalysisCache.saveToStorage();
  }

  private static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of AnalysisCache.cache.entries()) {
      if (now - entry.timestamp > AnalysisCache.MAX_CACHE_AGE) {
        AnalysisCache.cache.delete(key);
      }
    }
    AnalysisCache.saveToStorage();
  }

  private static saveToStorage(): void {
    try {
      const data = Object.fromEntries(AnalysisCache.cache.entries());
      localStorage.setItem(AnalysisCache.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save cache to localStorage:', error);
    }
  }
}

export interface DeepSeekAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  marketAnalysis: {
    overview: {
      summary: string;
      keyMetrics: string[];
    };
    catalysts: {
      primary: string;
      secondary: string[];
      context: string;
    };
    sectorImpacts: Array<{
      sector: string;
      impact: string;
      keyStocks: Array<{
        symbol: string;
        change: string;
        reason: string;
      }>;
    }>;
    tradingImplications: {
      shortTerm: {
        outlook: string;
        keyLevels: string[];
        tradingStrategy: string;
        risks: string[];
      };
      longTerm: {
        outlook: string;
        keyFactors: string[];
        investmentThesis: string;
      };
    };
  };
  confidence: number;
  source: string;
}

function normalizeUrl(url: string): string {
  try {
    url = url.replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    url = url.replace(/^(https?:\/\/)?(www\.)?/, '$1');
    return url.toLowerCase();
  } catch (error) {
    console.error('Error normalizing URL:', error);
    return url;
  }
}

export const analyzeArticle = async (
  article: ProcessedArticle
): Promise<DeepSeekAnalysis> => {
  console.log('Processing article:', {
    id: article.id,
    title: article.raw.title,
    url: article.raw.url
  });

  // Check local cache first
  const cacheKey = `analysis:${article.id}`;
  const cachedAnalysis = AnalysisCache.get(cacheKey);
  if (cachedAnalysis) {
    console.log('Retrieved analysis from local cache for:', article.raw.title);
    return cachedAnalysis;
  }

  // Check Supabase for existing analysis
  const normalizedUrl = normalizeUrl(article.raw.url);
  const { data: existingArticles, error: checkError } = await supabase
    .from('articles')
    .select(`
      id,
      title,
      article_analysis (*)
    `)
    .eq('url', normalizedUrl);

  if (checkError) {
    console.error('Error checking for existing article:', checkError);
    throw checkError;
  }

  // If we have existing analysis in Supabase, use it
  if (existingArticles && existingArticles.length > 0) {
    const articleWithAnalysis = existingArticles.find(article => 
      article.article_analysis && article.article_analysis.length > 0
    );

    if (articleWithAnalysis) {
      console.log('Found existing analysis in database for:', article.raw.title);
      const analysis = articleWithAnalysis.article_analysis[0];
      const formattedAnalysis: DeepSeekAnalysis = {
        sentiment: analysis.sentiment_label as 'positive' | 'negative' | 'neutral',
        marketAnalysis: {
          overview: {
            summary: analysis.market_impact_overview_summary,
            keyMetrics: analysis.market_impact_overview_key_metrics || []
          },
          catalysts: {
            primary: analysis.market_impact_catalysts_primary,
            secondary: analysis.market_impact_catalysts_secondary || [],
            context: analysis.market_impact_catalysts_context
          },
          sectorImpacts: analysis.market_impact_sector_impacts?.map((impact: any) => ({
            sector: impact.sector,
            impact: impact.impact,
            keyStocks: impact.key_stocks?.map((stock: any) => ({
              symbol: stock.symbol,
              change: stock.change,
              reason: stock.reason
            })) || []
          })) || [],
          tradingImplications: {
            shortTerm: {
              outlook: analysis.market_impact_trading_implications_short_term_outlook,
              keyLevels: analysis.market_impact_trading_implications_short_term_key_levels || [],
              tradingStrategy: analysis.market_impact_trading_implications_short_term_trading_strategy,
              risks: analysis.market_impact_trading_implications_short_term_risks || []
            },
            longTerm: {
              outlook: analysis.market_impact_trading_implications_long_term_outlook,
              keyFactors: analysis.market_impact_trading_implications_long_term_key_factors || [],
              investmentThesis: analysis.market_impact_trading_implications_long_term_investment_thesis
            }
          }
        },
        confidence: analysis.sentiment_confidence,
        source: 'deepseek'
      };
      
      // Cache the analysis locally
      AnalysisCache.set(cacheKey, formattedAnalysis);
      return formattedAnalysis;
    }
  }

  // Generate new analysis using our backend API
  console.log('Requesting new analysis from backend for:', article.raw.title);
  try {
    const response = await fetch(getEndpointUrl('/api/analysis/market-impact'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: article.raw.content
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend API request failed: ${response.status} ${errorText}`);
    }

    const analysis: DeepSeekAnalysis = await response.json();
    
    // Log the complete raw response
    console.log('Raw analysis from backend:', {
      title: article.raw.title,
      fullAnalysis: analysis,  // Log the entire analysis object
      rawJSON: JSON.stringify(analysis, null, 2)  // Pretty print the JSON
    });
    
    // Log the processed analysis for debugging
    console.log('Processed analysis:', {
      title: article.raw.title,
      sentiment: analysis.sentiment,
      marketAnalysis: {
        overview: analysis.marketAnalysis.overview,
        catalysts: analysis.marketAnalysis.catalysts,
        sectorImpacts: analysis.marketAnalysis.sectorImpacts,
        tradingImplications: {
          shortTerm: analysis.marketAnalysis.tradingImplications.shortTerm,
          longTerm: analysis.marketAnalysis.tradingImplications.longTerm
        }
      },
      confidence: analysis.confidence,
      source: analysis.source
    });
    
    // Cache the analysis locally
    AnalysisCache.set(cacheKey, analysis);
    console.log('Cached new analysis for:', article.raw.title);

    return analysis;
  } catch (error) {
    console.error('Failed to get analysis:', error);
    throw error;
  }
};