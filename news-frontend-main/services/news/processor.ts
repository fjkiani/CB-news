import { NewsArticle } from '../../api/types';
import { analyzeNewsArticle } from '../analysis/openai';

export interface ProcessedNews {
  article: NewsArticle;
  analysis: {
    summary: string;
    keyPoints: string[];
    sentiment: {
      score: number;
      label: 'positive' | 'negative' | 'neutral';
    };
    marketImpact: {
      immediate: string;
      longTerm: string;
    };
    relatedIndicators: string[];
  };
}

export async function processNewsArticle(article: NewsArticle): Promise<ProcessedNews> {
  const analysis = await analyzeNewsArticle(
    article.content,
    `Article from ${article.source} published at ${article.publishedAt}`
  );

  return {
    article,
    analysis: {
      summary: analysis.summary,
      keyPoints: extractKeyPoints(analysis.summary),
      sentiment: {
        score: analysis.sentiment.score,
        label: analysis.sentiment.label,
      },
      marketImpact: {
        immediate: analysis.marketImpact.shortTerm,
        longTerm: analysis.marketImpact.longTerm,
      },
      relatedIndicators: analysis.marketImpact.affectedSectors,
    },
  };
}

function extractKeyPoints(summary: string): string[] {
  // Use GPT to extract key points from the summary
  return summary.split('. ').filter(point => point.length > 0);
}