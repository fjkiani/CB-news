import { SupabaseStorage } from '../../../services/storage/supabase/supabaseStorage.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get absolute path to .env.local
const envPath = '/Users/fahadkiani/Desktop/development/project/.env.local';
console.log('Loading env from:', envPath);

// Load environment variables
const result = dotenv.config({ path: envPath });
console.log('Env loading result:', result.error ? 'Error' : 'Success');

// Debug: Check environment variables
console.log('Environment check:', {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'Found' : 'Missing',
  VITE_SUPABASE_KEY: process.env.VITE_SUPABASE_KEY ? 'Found' : 'Missing',
  envPath,
  cwd: process.cwd()
});

async function testStorage() {
  try {
    console.log('Creating Supabase storage...');
    const storage = new SupabaseStorage();
    
    console.log('Querying recent articles...');
    const { data, error } = await storage.supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    
    console.log('Recent articles:', {
      count: data.length,
      newest: data[0] ? {
        title: data[0].title,
        created_at: data[0].created_at
      } : null
    });

  } catch (error) {
    console.error('Storage test failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
}

testStorage();
