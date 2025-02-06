import React, { useState, useEffect } from 'react';
import { ProcessedArticle } from '../../services/news/types';
import { Clock, ExternalLink, TrendingUp, TrendingDown, Minus, Tag, BookOpen, ChevronDown, ChevronUp, Activity, BarChart } from 'lucide-react';
import { analyzeArticle, DeepSeekAnalysis } from '../../services/analysis/deepseek';

interface NewsCardProps {
  article: ProcessedArticle;
}

export const NewsCard: React.FC<NewsCardProps> = ({ article }) => {
  // Get initial state from localStorage or default to false
  const initialShowAnalysis = localStorage.getItem(`analysis-toggle-${article.id}`) === 'true';
  const [analysis, setAnalysis] = useState<DeepSeekAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(initialShowAnalysis);

  // Load analysis if it was previously shown
  useEffect(() => {
    if (showAnalysis && !analysis && !loading) {
      handleAnalysisToggle();
    }
  }, []); // Run once on mount

  // Only fetch analysis when user wants to see it
  const handleAnalysisToggle = async () => {
    const newState = !showAnalysis;
    setShowAnalysis(newState);
    // Save toggle state to localStorage
    localStorage.setItem(`analysis-toggle-${article.id}`, String(newState));

    if (newState && !analysis && !loading) {
      setLoading(true);
      try {
        const result = await analyzeArticle(article);
        console.log('Analysis result:', {
          title: article.raw.title,
          hasMarketAnalysis: !!result.marketAnalysis,
          marketAnalysis: result.marketAnalysis,
          fullResult: result
        });
        setAnalysis(result);
      } catch (error) {
        console.error('Failed to load analysis:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    if (sentiment === 'positive') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (sentiment === 'negative') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === 'positive') return 'text-green-600';
    if (sentiment === 'negative') return 'text-red-600';
    return 'text-gray-600';
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
      // console.debug('Date parsing in NewsCard:', {
      //   title: article.raw.title,
      //   original: dateToFormat,
      //   parsed: {
      //     date: date,
      //     isValid: !isNaN(date.getTime()),
      //     utc: date.toUTCString(),
      //     iso: date.toISOString()
      //   },
      //   timezone: {
      //     local: Intl.DateTimeFormat().resolvedOptions().timeZone,
      //     target: 'America/New_York'
      //   }
      // });
      
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
          {getSentimentIcon(article.sentiment)}
          {/* <span>
            Sentiment: {(article.sentiment.score * 100).toFixed(1)}%
            ({article.sentiment.confidence * 100}% confidence)
          </span> */}
        </div>
      </div>

      {/* Enhanced Sentiment Display */}
      {analysis && (
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            {getSentimentIcon(analysis.sentiment)}
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${getSentimentColor(analysis.sentiment)}`}>
                  {analysis.sentiment}
                </span>
                <span className="text-sm text-gray-500">
                  ({(analysis.confidence * 100).toFixed(0)}% confidence)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Summary if available */}
      {article.raw.naturalLanguage?.summary && (
        <div className="bg-gray-50 rounded-md p-4 mb-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="font-medium">AI Summary</span>
          </div>
          <p className="text-gray-600 text-sm">{article.raw.naturalLanguage.summary}</p>
        </div>
      )}

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

      {/* AI Analysis Section - Now with toggle */}
      <div className="mb-4">
        <button
          onClick={handleAnalysisToggle}
          className="flex items-center gap-2 text-gray-700 mb-2 hover:text-blue-600"
        >
          <BookOpen className="w-4 h-4" />
          <span className="font-medium">
            {showAnalysis ? 'Hide AI Analysis' : 'Show AI Analysis'}
          </span>
          {showAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showAnalysis && (
          <div>
            {loading ? (
              <div className="animate-pulse space-y-4 bg-blue-50 p-4 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-blue-200 rounded-full animate-bounce"></div>
                  <div>
                    <p className="text-blue-800 font-medium">Analysis in Queue</p>
                    <p className="text-blue-600 text-xs mt-1">
                      Due to API rate limits, analysis may take several minutes. 
                      Your request is queued and will be processed automatically.
                    </p>
                  </div>
                </div>
                <div className="h-4 bg-blue-100 rounded w-3/4"></div>
                <div className="h-4 bg-blue-100 rounded w-1/2"></div>
              </div>
            ) : analysis ? (
              <div className="space-y-4">
                {/* Topics Section */}
                {analysis.topics && analysis.topics.length > 0 && (
                  <div className="bg-indigo-50 p-4 rounded-md">
                    <h4 className="font-medium text-indigo-900 mb-2">Key Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.topics.map((topic, i) => (
                        <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Market Analysis Section */}
                {analysis.marketAnalysis && (
                  <div className="space-y-4">
                    {/* Overview */}
                    <div className="bg-blue-50 p-4 rounded-md">
                      <h4 className="font-medium text-blue-900 mb-2">Market Overview</h4>
                      <p className="text-blue-800 text-sm mb-2">{analysis.marketAnalysis.overview.summary}</p>
                      {analysis.marketAnalysis.overview.keyMetrics.length > 0 && (
                        <div className="mt-2">
                          <h5 className="text-sm font-medium text-blue-900 mb-1">Key Metrics</h5>
                          <ul className="list-disc list-inside text-sm text-blue-800">
                            {analysis.marketAnalysis.overview.keyMetrics.map((metric, i) => (
                              <li key={i}>{metric}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Catalysts */}
                    <div className="bg-purple-50 p-4 rounded-md">
                      <h4 className="font-medium text-purple-900 mb-2">Market Catalysts</h4>
                      <div className="space-y-2">
                        <div>
                          <h5 className="text-sm font-medium text-purple-900">Primary Driver</h5>
                          <p className="text-purple-800 text-sm">{analysis.marketAnalysis.catalysts.primary}</p>
                        </div>
                        {analysis.marketAnalysis.catalysts.secondary.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-purple-900">Additional Factors</h5>
                            <ul className="list-disc list-inside text-sm text-purple-800">
                              {analysis.marketAnalysis.catalysts.secondary.map((factor, i) => (
                                <li key={i}>{factor}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div>
                          <h5 className="text-sm font-medium text-purple-900">Market Context</h5>
                          <p className="text-purple-800 text-sm">{analysis.marketAnalysis.catalysts.context}</p>
                        </div>
                      </div>
                    </div>

                    {/* Sector Impacts */}
                    {analysis.marketAnalysis.sectorImpacts.length > 0 && (
                      <div className="bg-green-50 p-4 rounded-md">
                        <h4 className="font-medium text-green-900 mb-2">Sector Impacts</h4>
                        <div className="space-y-3">
                          {analysis.marketAnalysis.sectorImpacts.map((impact, i) => (
                            <div key={i} className="border-b border-green-100 last:border-0 pb-2 last:pb-0">
                              <h5 className="text-sm font-medium text-green-900">{impact.sector}</h5>
                              <p className="text-green-800 text-sm mb-1">{impact.impact}</p>
                              {impact.keyStocks.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {impact.keyStocks.map((stock, j) => (
                                    <div key={j} className="bg-green-100 px-2 py-1 rounded text-xs text-green-800">
                                      {stock.symbol} ({stock.change}): {stock.reason}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trading Implications */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Short-term */}
                      <div className="bg-amber-50 p-4 rounded-md">
                        <h4 className="font-medium text-amber-900 mb-2">Short-term Outlook</h4>
                        <div className="space-y-2">
                          <p className="text-amber-800 text-sm">{analysis.marketAnalysis.tradingImplications.shortTerm.outlook}</p>
                          {analysis.marketAnalysis.tradingImplications.shortTerm.keyLevels.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-amber-900">Key Levels</h5>
                              <ul className="list-disc list-inside text-sm text-amber-800">
                                {analysis.marketAnalysis.tradingImplications.shortTerm.keyLevels.map((level, i) => (
                                  <li key={i}>{level}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div>
                            <h5 className="text-sm font-medium text-amber-900">Trading Strategy</h5>
                            <p className="text-amber-800 text-sm">{analysis.marketAnalysis.tradingImplications.shortTerm.tradingStrategy}</p>
                          </div>
                          {analysis.marketAnalysis.tradingImplications.shortTerm.risks.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-amber-900">Key Risks</h5>
                              <ul className="list-disc list-inside text-sm text-amber-800">
                                {analysis.marketAnalysis.tradingImplications.shortTerm.risks.map((risk, i) => (
                                  <li key={i}>{risk}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Long-term */}
                      <div className="bg-indigo-50 p-4 rounded-md">
                        <h4 className="font-medium text-indigo-900 mb-2">Long-term Outlook</h4>
                        <div className="space-y-2">
                          <p className="text-indigo-800 text-sm">{analysis.marketAnalysis.tradingImplications.longTerm.outlook}</p>
                          {analysis.marketAnalysis.tradingImplications.longTerm.keyFactors.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-indigo-900">Key Factors to Monitor</h5>
                              <ul className="list-disc list-inside text-sm text-indigo-800">
                                {analysis.marketAnalysis.tradingImplications.longTerm.keyFactors.map((factor, i) => (
                                  <li key={i}>{factor}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div>
                            <h5 className="text-sm font-medium text-indigo-900">Investment Thesis</h5>
                            <p className="text-indigo-800 text-sm">{analysis.marketAnalysis.tradingImplications.longTerm.investmentThesis}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-md">
                <p className="text-yellow-800 font-medium mb-1">Analysis Pending</p>
                <p className="text-yellow-700 text-sm">
                  Your analysis request is in the queue. Due to API rate limits, we process requests 
                  gradually to ensure service stability. Please check back in a few minutes.
                </p>
              </div>
            )}
          </div>
        )}
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
      {(article.entities.companies.length > 0 || article.entities.sectors.length > 0) && (
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
      )}

      {/* Read more link */}
      <a href={article.raw.url} target="_blank" rel="noopener noreferrer" 
         className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
        Read full article <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
};