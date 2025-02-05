import logger from '../logger.js';
import axios from 'axios';

class DeepSeekService {
  constructor() {
    this.baseUrl = process.env.DEEPSEEK_API_URL || 'https://api.hyperbolic.xyz/v1';
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    // Configure axios instance with defaults
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      timeout: 120000 // Increased to 120 seconds to match backend timeout
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      response => {
        logger.debug('DeepSeek API response:', {
          status: response.status,
          dataSize: JSON.stringify(response.data).length,
          responseTime: response.config.metadata.responseTime
        });
        return response;
      },
      error => {
        const errorDetails = {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data,
          responseTime: error.config?.metadata?.responseTime
        };

        if (error.code === 'ECONNABORTED') {
          logger.error('DeepSeek API timeout:', errorDetails);
          throw new Error('Request timeout', { cause: error });
        }

        logger.error('DeepSeek API error:', errorDetails);
        throw error;
      }
    );

    // Add request interceptor for timing
    this.client.interceptors.request.use(
      config => {
        config.metadata = { startTime: new Date() };
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // Add response timing
    this.client.interceptors.response.use(
      response => {
        const endTime = new Date();
        response.config.metadata.responseTime = endTime - response.config.metadata.startTime;
        return response;
      },
      error => {
        if (error.config) {
          const endTime = new Date();
          error.config.metadata.responseTime = endTime - error.config.metadata.startTime;
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Analyze article content using DeepSeek API
   * @param {Object} article - Article object containing content to analyze
   * @returns {Promise<Object>} - Analyzed content in our standard format
   */
  async analyzeContent(article) {
    try {
      const response = await this.makeRequest(article);
      const validatedResponse = this.validateResponse(response.data);
      return this.transformResponse(validatedResponse);
    } catch (error) {
      if (this.shouldRetry(error)) {
        return this.retryAnalysis(article);
      }
      throw error;
    }
  }

  /**
   * Make API request to DeepSeek
   * @private
   */
  async makeRequest(article) {
    try {
      logger.debug('Making DeepSeek API request', {
        title: article.title,
        contentLength: article.content.length,
        startTime: new Date().toISOString()
      });

      const response = await this.client.post('/chat/completions', {
        model: "deepseek-ai/DeepSeek-V3",
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: this.buildPrompt(article)
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        stream: false
      });

      logger.debug('DeepSeek API request completed', {
        status: response.status,
        responseTime: response.config.metadata.responseTime
      });

      return response;
    } catch (error) {
      // Enhanced error handling
      if (error.message === 'Request timeout') {
        throw new Error('Analysis timeout - DeepSeek API took too long to respond');
      }
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded - Too many requests to DeepSeek API');
      }

      throw this.handleRequestError(error);
    }
  }

  /**
   * Build the analysis prompt
   * @private
   */
  buildPrompt(article) {
    return `Analyze this financial news article and provide a structured analysis in JSON format:

Title: ${article.title}
Content: ${article.content}

Focus on:
1. Overall market sentiment
2. Key metrics and data points
3. Primary and secondary market catalysts
4. Sector-specific impacts
5. Trading implications

Ensure the response is a valid JSON object following the specified schema.`;
  }

  /**
   * Get the system prompt for DeepSeek
   * @private
   */
  getSystemPrompt() {
    return `You are a financial news analysis API that returns responses EXCLUSIVELY as JSON objects following this schema:
{
  "sentiment": { "label": "positive/negative/neutral", "score": 0.0-1.0 },
  "marketAnalysis": {
    "overview": {
      "summary": "Brief market overview",
      "keyMetrics": ["Important metric 1", "Important metric 2"]  // Array of strings
    },
    "catalysts": {
      "primary": "Main market driver",
      "secondary": ["Other factors"],
      "context": "Market context"
    },
    "sectorImpacts": [{
      "sector": "Sector name",
      "impact": "Impact description",
      "keyStocks": [{
        "name": "Stock name",
        "change": "Price change",
        "reason": "Reason for change"
      }]
    }],
    "tradingImplications": {
      "shortTerm": {
        "outlook": "Short-term view",
        "keyLevels": ["Important levels"],
        "tradingStrategy": "Strategy suggestion",
        "risks": ["Key risks"]
      },
      "longTerm": {
        "outlook": "Long-term view",
        "keyFactors": ["Important factors"],
        "investmentThesis": "Investment approach"
      }
    }
  },
  "confidence": 0.0-1.0
}`;
  }

  /**
   * Validate the API response
   * @private
   */
  validateResponse(response) {
    try {
      if (!response.choices || !response.choices[0]?.message?.content) {
        throw new Error('Invalid response structure');
      }

      const content = response.choices[0].message.content;
      return this.extractJSON(content);
    } catch (error) {
      logger.error('Response validation failed:', error);
      throw error;
    }
  }

  /**
   * Extract and clean JSON from response text
   * @private
   */
  extractJSON(text) {
    try {
      // First try direct JSON parse
      return JSON.parse(text);
    } catch (e) {
      // If that fails, try to extract JSON from the text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          logger.error('Failed to parse extracted JSON:', e2);
          throw new Error('Invalid JSON in response');
        }
      }
      throw new Error('No valid JSON found in response');
    }
  }

  /**
   * Transform API response to our standard format
   * @private
   */
  transformResponse(response) {
    // Ensure keyMetrics is an array of strings
    if (response.marketAnalysis?.overview?.keyMetrics) {
      if (Array.isArray(response.marketAnalysis.overview.keyMetrics)) {
        // If items are objects, convert them to strings
        response.marketAnalysis.overview.keyMetrics = response.marketAnalysis.overview.keyMetrics.map(metric => {
          if (typeof metric === 'object') {
            return `${metric.metric}: ${metric.value}${metric.trend ? ` (${metric.trend})` : ''}`;
          }
          return String(metric);
        });
      } else {
        // If not an array, set to empty array
        response.marketAnalysis.overview.keyMetrics = [];
      }
    }

    return {
      sentiment: response.sentiment.label,
      marketAnalysis: response.marketAnalysis,
      confidence: response.confidence,
      source: 'deepseek'
    };
  }

  /**
   * Determine if we should retry the request
   * @private
   */
  shouldRetry(error) {
    return error.response?.status === 429 || // Rate limit
           error.response?.status >= 500 ||  // Server error
           error.code === 'ECONNABORTED';    // Timeout
  }

  /**
   * Retry analysis with exponential backoff
   * @private
   */
  async retryAnalysis(article, attempt = 1, maxAttempts = 3) {
    if (attempt > maxAttempts) {
      throw new Error(`Max retry attempts reached (${maxAttempts})`);
    }

    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
    await new Promise(resolve => setTimeout(resolve, delay));

    logger.info(`Retrying analysis (attempt ${attempt}/${maxAttempts})`);
    return this.analyzeContent(article);
  }

  /**
   * Handle API request errors
   * @private
   */
  handleRequestError(error) {
    const errorDetails = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    };

    if (error.code === 'ECONNABORTED') {
      return new Error('Analysis timeout - DeepSeek API request timed out', { cause: error });
    }

    if (error.response?.status === 429) {
      return new Error('Rate limit exceeded - Too many requests to DeepSeek API', { cause: error });
    }

    if (error.response?.status >= 500) {
      return new Error('DeepSeek API server error - Please try again later', { cause: error });
    }

    return new Error(`DeepSeek API error: ${error.message}`, { cause: error });
  }
}

export default DeepSeekService; 


