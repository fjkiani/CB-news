declare class SupabaseStorage {
  constructor();
  ensureDate(dateInput: Date | string): Date;
  storeArticle(article: any): Promise<any>;
  storeArticles(articles: any[]): Promise<any[]>;
  getRecentArticles(limit?: number): Promise<any[]>;
  getArticlesByCategory(category: string): Promise<any[]>;
  searchArticles(query: string): Promise<any[]>;
  getArticleById(id: string | number): Promise<any>;
  deleteArticle(where: { url: string }): Promise<void>;
  getCategories(): Promise<string[]>;
  getSampleArticle(): Promise<any>;
}

export { SupabaseStorage };
export default SupabaseStorage; 