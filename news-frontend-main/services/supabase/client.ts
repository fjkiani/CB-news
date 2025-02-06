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

interface Article {
  title: string;
  url: string;
  source: string;
  content?: string;
  published_at: string;
}

export const storeArticles = async (articles: Article[]) => {
  try {
    // Group articles by source
    const articlesBySource = articles.reduce((acc, article) => {
      const source = article.source || 'Unknown';
      acc[source] = acc[source] || [];
      acc[source].push(article);
      return acc;
    }, {} as Record<string, Article[]>);

    // Check for duplicates per source
    for (const [source, sourceArticles] of Object.entries(articlesBySource)) {
      const { data: existingArticles } = await supabase
        .from('articles')
        .select('title, url')
        .eq('source', source)
        .in('title', sourceArticles.map(a => a.title));

      const existingTitles = new Set(existingArticles?.map(a => a.title) || []);
      
      const newArticles = sourceArticles.filter(article => 
        !existingTitles.has(article.title)
      );

      if (newArticles.length > 0) {
        await supabase
          .from('articles')
          .insert(newArticles)
          .select();
      }
    }

    return { data: articles, error: null };
  } catch (error) {
    console.error('Error storing articles:', error);
    throw error;
  }
};