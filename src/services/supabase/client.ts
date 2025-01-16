import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug environment variables
console.log('Supabase environment check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  urlStart: supabaseUrl?.substring(0, 20) + '...',
  keyStart: supabaseKey?.substring(0, 20) + '...',
  envKeys: Object.keys(import.meta.env).filter(key => 
    key.includes('SUPABASE') || 
    key.includes('DB_') || 
    key.includes('SERVICE_') ||
    key.includes('VITE_')
  )
});

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Validate key format (just check if it's a JWT)
if (!supabaseKey.startsWith('eyJ')) {
  console.error('Invalid Supabase key format');
  throw new Error('Invalid Supabase key format');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  }
});