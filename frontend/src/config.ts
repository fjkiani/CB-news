export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://backend-khaki-omega.vercel.app'  // Deployed backend
  : 'http://localhost:3001';           // Local development 