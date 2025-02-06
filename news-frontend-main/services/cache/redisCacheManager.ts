interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

export class RedisCacheManager {
  private prefix: string;
  private defaultTTL: number;

  constructor(prefix: string, options: CacheOptions = {}) {
    this.prefix = prefix;
    this.defaultTTL = options.ttl || 3600; // Default 1 hour
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cachedItem = localStorage.getItem(this.getKey(key));
      if (!cachedItem) return null;

      const { value, expiry } = JSON.parse(cachedItem);
      
      if (expiry && Date.now() > expiry) {
        await this.delete(key);
        return null;
      }

      return value as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      const item = {
        value,
        expiry: Date.now() + (ttl * 1000)
      };

      localStorage.setItem(this.getKey(key), JSON.stringify(item));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
} 