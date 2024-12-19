import axios from 'axios';
import { ILogger } from '../../types/logger';
import { DiffbotConfig, DiffbotResponse } from './types';

export class DiffbotService {
  private apiToken: string;
  private apiUrl: string;
  private logger: ILogger;

  constructor(config: DiffbotConfig, logger: ILogger) {
    this.apiToken = config.apiToken;
    this.apiUrl = config.apiUrl || 'https://api.diffbot.com/v3/analyze';
    this.logger = logger;
  }

  async analyze(url: string): Promise<DiffbotResponse> {
    try {
      const response = await axios.get<DiffbotResponse>(this.apiUrl, {
        params: {
          token: this.apiToken,
          url: url
        }
      });
      
      this.logger.info(`Successfully analyzed URL: ${url}`);
      return response.data;
      
    } catch (error) {
      this.logger.error('Diffbot analysis failed:', error);
      throw new Error(`Diffbot analysis failed: ${error.message}`);
    }
  }
} 