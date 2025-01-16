export const BACKEND_CONFIG = {
  BASE_URL: import.meta.env.MODE === 'production'
    ? 'https://backend-khaki-omega.vercel.app'
    : 'http://localhost:3001',
  HEALTH_CHECK_INTERVAL: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// Debug log to verify environment
console.log('Current environment:', {
  mode: import.meta.env.MODE,
  baseUrl: BACKEND_CONFIG.BASE_URL
});