import { useNewsProcessor } from '../hooks/useNewsProcessor';
import { useNewsScraper } from '../hooks/useNewsScraper';

export const NewsDashboard = () => {
  const { articles, loading, error, refreshNews } = useNewsScraper();
  const { processedArticles } = useNewsProcessor(articles);

  return (
    <div>
      <div className="controls">
        <button 
          onClick={() => refreshNews(true)} 
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Force Refresh'}
        </button>
      </div>
      
      {/* Rest of your dashboard */}
    </div>
  );
}; 