/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_ALPHAVANTAGE_API_KEY: string
  readonly VITE_FRED_API_KEY: string
  readonly VITE_RAPIDAPI_KEY: string
  readonly VITE_DIFFBOT_TOKEN: string
  readonly VITE_COHERE_API_KEY: string
  readonly VITE_DEEPSEEK_API_KEY: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_BACKEND_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 