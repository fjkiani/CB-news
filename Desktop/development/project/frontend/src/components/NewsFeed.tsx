import { useEffect, useState } from 'react';
import useNewsScraper from '../hooks/useNewsScraper';
import useNewsProcessor from '../hooks/useNewsProcessor';
import { Article } from '../types';

const CACHE_KEY = 'news_analysis_cache';
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

function NewsFeed() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { fetchArticles } = useNewsScraper();
  const { processArticles } = useNewsProcessor();

  const loadNews = async (forceFresh = false) => {
    setIsLoading(true);
    try {
      // Check cache unless forcing fresh data
      if (!forceFresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { timestamp, articles: cachedArticles } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          if (age < CACHE_DURATION) {
            console.log(`Using cached news data (${Math.round(age / 1000)}s old)`);
            setArticles(cachedArticles);
            return;
          }
        }
      }

      // Fetch and process fresh articles
      console.log('Fetching fresh news data...');
      const freshArticles = await fetchArticles();
      
      if (freshArticles.length) {
        const processedArticles = await processArticles(freshArticles);
        
        // Cache the processed articles
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          articles: processedArticles
        }));
        
        setArticles(processedArticles);
      }
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load news on mount
  useEffect(() => {
    loadNews();
  }, []);

  return (
    <div>
      <div className="controls">
        <button 
          onClick={() => loadNews(true)}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh News'}
        </button>
        {articles.length > 0 && (
          <span className="article-count">
            {articles.length} articles loaded
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="loading">Loading news...</div>
      ) : (
        <div className="articles-grid">
          {articles.map(article => (
            <ArticleCard 
              key={article.id} 
              article={article} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default NewsFeed;