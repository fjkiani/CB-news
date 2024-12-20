import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local first (it has the service_role key)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testSupabase() {
  try {
    console.log('Testing Supabase connection...');
    
    // Debug: Print environment variables (safely)
    console.log('Environment check:', {
      hasUrl: !!process.env.VITE_SUPABASE_URL,
      hasKey: !!process.env.VITE_SUPABASE_KEY,
      urlStart: process.env.VITE_SUPABASE_URL?.substring(0, 20),
      keyType: process.env.VITE_SUPABASE_KEY?.includes('service_role') ? 'service_role' : 'anon'
    });

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_KEY
    );

    // Test a simple query
    const { data, error } = await supabase
      .from('articles')
      .select('id, title')
      .limit(1);

    if (error) {
      console.error('Query error:', error);
      throw error;
    }

    console.log('Supabase connection successful!');
    console.log('Sample data:', data);

  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test
testSupabase();
