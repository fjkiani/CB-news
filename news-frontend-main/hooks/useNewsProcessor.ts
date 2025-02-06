import { useState, useEffect } from 'react';
import { RawNewsArticle, ProcessedArticle } from '../services/news/types';

export function useNewsProcessor(articles: RawNewsArticle[]) {
  const [processedArticles, setProcessedArticles] = useState<ProcessedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      
      // // Log date parsing for debugging
      // console.debug('Date parsing in useNewsProcessor:', {
      //   original: dateString,
      //   parsed: date,
      //   isValid: !isNaN(date.getTime()),
      //   timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      //   utcString: date.toUTCString(),
      //   isoString: date.toISOString(),
      //   components: {
      //     year: date.getUTCFullYear(),
      //     month: date.getUTCMonth() + 1,
      //     day: date.getUTCDate(),
      //     hours: date.getUTCHours(),
      //     minutes: date.getUTCMinutes()
      //   }
      // });

      if (isNaN(date.getTime())) {
        console.warn('Invalid date in useNewsProcessor:', dateString);
        return new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
          timeZoneName: 'short'
        });
      }

      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZoneName: 'short'
      });
    } catch (error) {
      console.error('Date formatting error in useNewsProcessor:', error);
      return new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZoneName: 'short'
      });
    }
  };

  useEffect(() => {
    const processArticles = async () => {
      try {
        setLoading(true);
        console.log('Processing articles:', articles);

        const processed = articles.map((article) => {
          // console.log('Processing article:', article);
          
          const sentiment = {
            score: article.sentiment?.score ?? 0,
            label: article.sentiment?.label ?? 'neutral',
            confidence: article.sentiment?.confidence ?? 0
          };

          // Parse and validate the date
          let validDate = null;
          const datesToTry = [article.created_at, article.publishedAt, article.date];
          
          for (const dateStr of datesToTry) {
            if (!dateStr) continue;
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
              validDate = parsed;
              break;
            }
          }

          // If no valid date found, use current time
          const publishedAt = validDate ? validDate.toISOString() : new Date().toISOString();

          // Log date selection for debugging
          // console.debug('Date selection:', {
          //   article_title: article.title,
          //   created_at: article.created_at,
          //   publishedAt: article.publishedAt,
          //   date: article.date,
          //   selected: publishedAt,
          //   validDate: validDate?.toISOString()
          // });

          return {
            id: `${article.source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            raw: {
              ...article,
              publishedAt: publishedAt,
            },
            published_at: publishedAt,
            display_date: formatDate(publishedAt),
            summary: article.content?.slice(0, 200) + '...' ?? 'No content available',
            keyPoints: [article.content?.slice(0, 100) ?? 'No content available'],
            entities: {
              companies: [],
              sectors: [],
              indicators: []
            },
            sentiment: {
              ...sentiment,
              label: sentiment.label as 'positive' | 'negative' | 'neutral'
            },
            marketImpact: {
              shortTerm: {
                description: 'Analysis pending...',
                confidence: 0,
                affectedSectors: []
              },
              longTerm: {
                description: 'Analysis pending...',
                confidence: 0,
                potentialRisks: []
              }
            }
          };
        });

        const sortedArticles = processed.sort((a, b) => {
          const dateA = new Date(a.raw.publishedAt);
          const dateB = new Date(b.raw.publishedAt);
          
          // Log date comparison for debugging
          // console.debug('Date comparison:', {
          //   articleA: {
          //     title: a.raw.title,
          //     date: a.raw.publishedAt,
          //     parsed: dateA.toISOString()
          //   },
          //   articleB: {
          //     title: b.raw.title,
          //     date: b.raw.publishedAt,
          //     parsed: dateB.toISOString()
          //   }
          // });
          
          return dateB.getTime() - dateA.getTime();
        });

        console.log('Processed and sorted articles:', sortedArticles.map(a => ({
          title: a.raw.title,
          date: a.raw.publishedAt,
          parsed: new Date(a.raw.publishedAt).toISOString()
        })));

        setProcessedArticles(sortedArticles);
        setError(null);
      } catch (err) {
        console.error('Error processing articles:', err);
        setError(err instanceof Error ? err : new Error('Failed to process articles'));
      } finally {
        setLoading(false);
      }
    };

    if (articles.length > 0) {
      processArticles();
    }
  }, [articles]);

  return { processedArticles, loading, error };
}