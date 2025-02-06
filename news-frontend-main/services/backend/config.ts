/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_API_URL_PROD: string
  readonly VITE_BACKEND_API_URL_DEV: string
  readonly VITE_USE_LOCAL_BACKEND: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Backend API configuration
const useLocalBackend = import.meta.env.VITE_USE_LOCAL_BACKEND === 'true';
const prodBackendUrl = import.meta.env.VITE_BACKEND_API_URL_PROD;
const devBackendUrl = import.meta.env.VITE_BACKEND_API_URL_DEV;

export const backendConfig = {
  baseUrl: useLocalBackend ? devBackendUrl : prodBackendUrl,
  useLocalBackend,
  endpoints: {
    health: '/api/health',
    analysis: {
      marketImpact: '/api/analysis/market-impact',
      batchMarketImpact: '/api/analysis/batch-market-impact',
      testDeepseek: '/api/analysis/test-deepseek'  // New endpoint for testing
    },
    news: {
      latest: '/api/news/latest',
      storage: '/api/news/storage'
    }
  }
};

// Helper to get full endpoint URL
export const getEndpointUrl = (endpoint: string): string => {
  return `${backendConfig.baseUrl}${endpoint}`;
};

// Helper to check if we're using local backend
export const isUsingLocalBackend = (): boolean => {
  return backendConfig.useLocalBackend;
};

// Helper to toggle between local and production backend
export const toggleBackend = (): void => {
  const newValue = (!backendConfig.useLocalBackend).toString();
  localStorage.setItem('useLocalBackend', newValue);
  window.location.reload(); // Reload to apply changes
};

// Initialize from localStorage if available
if (localStorage.getItem('useLocalBackend') !== null) {
  backendConfig.useLocalBackend = localStorage.getItem('useLocalBackend') === 'true';
}

// Debug log to verify environment
console.log('Current environment:', {
  mode: import.meta.env.MODE,
  baseUrl: backendConfig.baseUrl
});