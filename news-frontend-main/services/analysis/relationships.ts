import { NewsArticle } from '../../api/types';
import { callDeepSeek } from './deepseek';
import { createClient } from '@supabase/supabase-js';
import { DeepSeekAnalysis } from './deepseek';

interface RelationshipNode {
  id: string;
  type: 'asset' | 'event' | 'sector';
  name: string;
}

interface RelationshipEdge {
  source: string;
  target: string;
  strength: number;
  type: 'positive' | 'negative' | 'neutral';
}

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface RelatedArticle {
  id: number;
  title: string;
  summary: string;
  similarity: number;
  sentiment_label: 'positive' | 'negative' | 'neutral';
  published_at: string;
}

// Similarity thresholds for different types of relationships
const SIMILARITY_THRESHOLDS = {
  HISTORICAL_PARALLEL: 0.85,    // Very high similarity - almost identical situations
  STRONG_RELATION: 0.75,        // Strong topical/thematic overlap
  MODERATE_RELATION: 0.65,      // Related context/implications
  WEAK_RELATION: 0.50          // Loose connection/same sector
};

export const extractRelationships = async (
  articles: NewsArticle[],
  marketData: any
): Promise<{ nodes: RelationshipNode[]; edges: RelationshipEdge[] }> => {
  const result = await callDeepSeek([
    {
      role: 'system',
      content: 'Extract market relationships from the provided news articles and market data.',
    },
    {
      role: 'user',
      content: JSON.stringify({ articles, marketData }),
    },
  ]);

  return JSON.parse(result);
};

export async function findSimilarArticles(
  articleId: number,
  threshold: number = SIMILARITY_THRESHOLDS.MODERATE_RELATION,
  limit: number = 5
): Promise<RelatedArticle[]> {
  try {
    // First get the embedding for our target article
    const { data: sourceArticle, error: sourceError } = await supabase
      .from('article_analysis')
      .select('embedding')
      .eq('article_id', articleId)
      .single();

    if (sourceError || !sourceArticle) {
      throw new Error('Could not find source article embedding');
    }

    // Then find similar articles using vector similarity
    const { data: similarArticles, error: searchError } = await supabase
      .rpc('match_articles', {
        query_embedding: sourceArticle.embedding,
        match_threshold: threshold,
        match_count: limit
      });

    if (searchError) {
      throw searchError;
    }

    return similarArticles;
  } catch (error) {
    console.error('Error finding similar articles:', error);
    return [];
  }
}