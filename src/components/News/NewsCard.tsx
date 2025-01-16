import React from 'react';
import { ProcessedArticle } from '../../services/news/types';
import { Clock, ExternalLink, TrendingUp, TrendingDown, Minus, Tag, BookOpen } from 'lucide-react';

interface NewsCardProps {
  article: ProcessedArticle;
}

export const NewsCard: React.FC<NewsCardProps> = ({ article }) => {
  const getSentimentIcon = () => {
    if (article.sentiment.score > 0.2) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (article.sentiment.score < -0.2) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const formatDate = (dateString: string | undefined | null) => {
    try {
      // Get the most reliable date
      const dateToFormat = dateString || article.raw.created_at;
      if (!dateToFormat) {
        console.warn('No valid date available:', { 
          title: article.raw.title,
          publishedAt: dateString, 
          created_at: article.raw.created_at 
        });
        return 'Date unavailable';
      }

      const date = new Date(dateToFormat);
      
      // Log date parsing for debugging
      console.debug('Date parsing in NewsCard:', {
        title: article.raw.title,
        original: dateToFormat,
        parsed: {
          date: date,
          isValid: !isNaN(date.getTime()),
          utc: date.toUTCString(),
          iso: date.toISOString()
        },
        timezone: {
          local: Intl.DateTimeFormat().resolvedOptions().timeZone,
          target: 'America/New_York'
        }
      });
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date in NewsCard:', {
          title: article.raw.title,
          dateString: dateToFormat
        });
        return 'Invalid date';
      }
      
      // Format in New York timezone
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZone: 'America/New_York',
        timeZoneName: 'short'
      }).format(date);
    } catch (error) {
      console.error('Date formatting error in NewsCard:', {
        error,
        title: article.raw.title,
        dateString
      });
      return 'Date error';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold mb-2">{article.raw.title}</h3>
      
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Clock className="w-4 h-4" />
          <span>{formatDate(article.raw.publishedAt)}</span>
        </div>
        <div className="flex items-center gap-1">
          {getSentimentIcon()}
          <span>
            Sentiment: {(article.sentiment.score * 100).toFixed(1)}%
            ({article.sentiment.confidence * 100}% confidence)
          </span>
        </div>
      </div>

      {/* AI Summary if available */}
      {article.raw.naturalLanguage?.summary ? (
        <div className="bg-gray-50 rounded-md p-4 mb-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="font-medium">AI Summary</span>
          </div>
          <p className="text-gray-600 text-sm">{article.raw.naturalLanguage.summary}</p>
        </div>
      ) : null}

      {/* Full article content */}
      <div className="bg-gray-50 rounded-md p-4 mb-4">
        <div className="flex items-center gap-2 text-gray-700 mb-2">
          <BookOpen className="w-4 h-4" />
          <span className="font-medium">Full Article</span>
        </div>
        <p className="text-gray-600 text-sm whitespace-pre-line">
          {article.raw.content ? article.raw.content.replace(/\d+\s+(?:minutes?|hours?|days?)\s+ago/i, '').trim() : 'No content available'}
        </p>
      </div>

      {/* Diffbot Tags */}
      {article.raw.tags && article.raw.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <Tag className="w-4 h-4" />
            <span className="font-medium">Topics</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {article.raw.tags.map((tag, i) => (
              <span 
                key={i} 
                className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                title={`Score: ${tag.score}`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Existing entities */}
      <div className="space-y-2 mb-4">
        <div className="flex flex-wrap gap-2">
          {article.entities.companies.map((company, i) => (
            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {company}
            </span>
          ))}
          {article.entities.sectors.map((sector, i) => (
            <span key={i} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              {sector}
            </span>
          ))}
        </div>
      </div>

      {/* Read more link */}
      <a href={article.raw.url} target="_blank" rel="noopener noreferrer" 
         className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
        Read full article <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
};