import React, { useState } from 'react';
import { NewsGrid } from '../News/NewsGrid';
import { SentimentOverview } from '../Analysis/SentimentOverview';
import { MarketRelationshipGraph } from '../Analysis/MarketRelationshipGraph';
import { ServiceStatus } from './ServiceStatus';
import { useNewsScraper } from '../../hooks/useNewsScraper';
import { useNewsProcessor } from '../../hooks/useNewsProcessor';
import { Newspaper, AlertCircle } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { Investing11News } from '../News/Investing11News';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

export const NewsDashboard: React.FC = () => {
  const { news, loading: newsLoading, error: newsError } = useNewsScraper();
  const { processedArticles, loading: processingLoading, error: processingError } = useNewsProcessor(news);

  const isLoading = newsLoading || processingLoading;
  const error = newsError || processingError;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Newspaper className="w-6 h-6 text-blue-600" />
                Market Intelligence Dashboard
              </h1>
              <ServiceStatus />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-red-700 font-medium">{error.message}</p>
                <p className="text-red-600 text-sm mt-1">
                  Please ensure the backend service is running and try again
                </p>
              </div>
            </div>
          ) : null}

          <Tabs defaultValue="trading-economics">
            <TabsList className="mb-4">
              <TabsTrigger value="trading-economics">Trading Economics</TabsTrigger>
              <TabsTrigger value="investing11">Investing11</TabsTrigger>
            </TabsList>

            <TabsContent value="trading-economics">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <NewsGrid articles={processedArticles} loading={isLoading} />
                </div>
                <div className="space-y-6">
                  <SentimentOverview articles={processedArticles} />
                  <MarketRelationshipGraph articles={processedArticles} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="investing11">
              <Investing11News />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ErrorBoundary>
  );
};