export interface ServiceStatus {
  status: 'ok' | 'error';
  message?: string;
}

export interface ScraperError {
  error: string;
  message: string;
}