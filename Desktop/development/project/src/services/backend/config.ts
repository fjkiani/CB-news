export const BACKEND_CONFIG = {
  BASE_URL: import.meta.env.VITE_SCRAPER_API_URL || 'http://localhost:3001',
  HEALTH_CHECK_INTERVAL: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;