const generateArticleKey = (article: Article) => {
  // Create a composite key using multiple fields
  return `${article.url}_${article.title}_${article.publishedAt}`.toLowerCase();
};

const storeArticles = async (articles: Article[]) => {
  const uniqueArticles = Array.from(
    new Map(articles.map(article => [generateArticleKey(article), article])).values()
  );
  
  // When storing in Supabase, include the composite key
  const articlesData = uniqueArticles.map(article => ({
    ...article,
    unique_key: generateArticleKey(article),
    created_at: new Date().toISOString()
  }));

  return supabase
    .from('articles')
    .upsert(articlesData, {
      onConflict: 'unique_key',
      ignoreDuplicates: true
    });
}; 