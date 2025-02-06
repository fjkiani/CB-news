import React from 'react';
import { NewsDashboard } from './components/Dashboard/NewsDashboard';
import { Investing11News } from './components/News/Investing11News';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NewsDashboard />
      <Investing11News />
    </QueryClientProvider>
  );
}

export default App;