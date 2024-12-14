import axios from 'axios';
import { Article, AnalysisResult } from '../types';
import { API_BASE_URL } from '../config';

async function analyzeArticles(articles: Article[]): Promise<AnalysisResult[]> {
  const endpoint = `${API_BASE_URL}/api/analysis/batch-market-impact`;
  
  try {
    console.log(`Analyzing ${articles.length} articles in batch`);
    
    const response = await axios.post(endpoint, { articles });
    console.log(`Successfully analyzed ${response.data.length} articles`);
    
    return response.data;
    
  } catch (error) {
    console.error('Batch analysis failed:', error);
    // Fallback to basic analysis
    return articles.map(article => ({
      articleId: article.id,
      analysis: 'Analysis temporarily unavailable',
      confidence: 0,
      source: 'error'
    }));
  }
}

// Update the useNewsProcessor hook
export function useNewsProcessor(articles: Article[]) {
  const processArticles = async (articles: Article[]) => {
    if (!articles.length) return [];
    
    try {
      // Single API call for all articles
      const analysisResults = await analyzeArticles(articles);
      
      // Merge analysis results with articles
      return articles.map(article => {
        const analysis = analysisResults.find(
          result => result.articleId === article.id
        );
        
        return {
          ...article,
          analysis: analysis?.analysis || 'No analysis available',
          confidence: analysis?.confidence || 0,
          source: analysis?.source || 'none'
        };
      });
      
    } catch (error) {
      console.error('News processing failed:', error);
      return articles;
    }
  };

  return { processArticles };
}