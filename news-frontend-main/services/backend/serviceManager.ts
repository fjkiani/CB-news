import { retry } from '../../utils/retry';
import { BACKEND_CONFIG } from './config';
import type { ServiceStatus } from './types';

class BackendServiceManager {
  private static instance: BackendServiceManager;
  private serviceUrl: string;
  private isServiceRunning: boolean = false;
  private healthCheckTimeout: number | null = null;

  private constructor() {
    this.serviceUrl = BACKEND_CONFIG.BASE_URL;
  }

  static getInstance(): BackendServiceManager {
    if (!BackendServiceManager.instance) {
      BackendServiceManager.instance = new BackendServiceManager();
    }
    return BackendServiceManager.instance;
  }

  async checkService(): Promise<boolean> {
    if (!this.serviceUrl) return false;

    try {
      console.log('Checking service health at:', `${this.serviceUrl}/api/health`);
      const response = await fetch(`${this.serviceUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn('Health check failed with status:', response.status);
        throw new Error('Health check failed');
      }
      
      const status: ServiceStatus = await response.json();
      this.isServiceRunning = status.status === 'ok';
      console.log('Service health status:', this.isServiceRunning ? 'running' : 'down');
      return this.isServiceRunning;
    } catch (error) {
      console.warn('Backend service check failed:', error);
      this.isServiceRunning = false;
      return false;
    }
  }

  async ensureServiceRunning(): Promise<void> {
    if (!this.serviceUrl) {
      throw new Error('Scraper API URL not configured');
    }

    const isRunning = await retry(
      () => this.checkService(),
      {
        attempts: BACKEND_CONFIG.RETRY_ATTEMPTS,
        delay: BACKEND_CONFIG.RETRY_DELAY,
        onError: (error, attempt) => {
          console.warn(`Backend service check attempt ${attempt} failed:`, error);
        }
      }
    );

    if (!isRunning) {
      throw new Error('Backend service is not available');
    }
  }

  startHealthCheck(interval: number = BACKEND_CONFIG.HEALTH_CHECK_INTERVAL): void {
    this.stopHealthCheck();
    
    const check = async () => {
      await this.checkService();
      this.healthCheckTimeout = window.setTimeout(check, interval);
    };

    check();
  }

  stopHealthCheck(): void {
    if (this.healthCheckTimeout) {
      window.clearTimeout(this.healthCheckTimeout);
      this.healthCheckTimeout = null;
    }
  }

  getServiceUrl(): string {
    return this.serviceUrl;
  }

  isRunning(): boolean {
    return this.isServiceRunning;
  }
}

// Export a singleton instance
export const backendService = BackendServiceManager.getInstance();