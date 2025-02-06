import logger from '../logger.js';
import axios from 'axios';
import https from 'https';
import ModelManager from './ModelManager.js';

// Default timeout configuration
const DEFAULT_TIMEOUTS = {
  request: 9000000,    // 90 seconds
  socket: 15000000,    // 150 seconds
  analysis: 12000000,  // 120 seconds
  retry: 100000       // 1 second
};

// Helper function to safely parse environment variables
function parseEnvTimeout(name, defaultValue) {
  const value = process.env[name];
  if (!value) {
    logger.warn(`Environment variable ${name} not found, using default: ${defaultValue}`);
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    logger.warn(`Invalid value for ${name}: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

class DeepSeekService {
  constructor(config = {}) {
    // Load and validate environment variables first
    const envConfig = {
      timeout: parseEnvTimeout('DEEPSEEK_TIMEOUT', DEFAULT_TIMEOUTS.request),
      socketTimeout: parseEnvTimeout('DEEPSEEK_SOCKET_TIMEOUT', DEFAULT_TIMEOUTS.socket),
      analysisTimeout: parseEnvTimeout('ANALYSIS_TIMEOUT', DEFAULT_TIMEOUTS.analysis),
      retryDelay: parseEnvTimeout('DEEPSEEK_RETRY_DELAY', DEFAULT_TIMEOUTS.retry),
      retryAttempts: parseEnvTimeout('DEEPSEEK_RETRY_ATTEMPTS', 3)
    };

    this.baseUrl = process.env.DEEPSEEK_API_URL || 'https://api.hyperbolic.xyz/v1';
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.modelName = 'deepseek-chat';

    logger.info('Initializing DeepSeek service with configuration:', {
      envConfig,
      baseUrl: this.baseUrl,
      modelName: this.modelName,
      rawEnv: {
        DEEPSEEK_TIMEOUT: process.env.DEEPSEEK_TIMEOUT,
        DEEPSEEK_SOCKET_TIMEOUT: process.env.DEEPSEEK_SOCKET_TIMEOUT,
        ANALYSIS_TIMEOUT: process.env.ANALYSIS_TIMEOUT,
        DEEPSEEK_RETRY_DELAY: process.env.DEEPSEEK_RETRY_DELAY,
        DEEPSEEK_RETRY_ATTEMPTS: process.env.DEEPSEEK_RETRY_ATTEMPTS
      }
    });
    
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    if (!this.baseUrl) {
      throw new Error('DeepSeek API URL not configured');
    }

    // Set timeout configuration
    this.timeoutConfig = {
      request: envConfig.timeout,
      socket: envConfig.socketTimeout,
      analysis: envConfig.analysisTimeout,
      retry: envConfig.retryDelay
    };

    // Configuration with defaults
    this.config = {
      timeout: this.timeoutConfig.request,
      retryAttempts: envConfig.retryAttempts,
      retryDelay: this.timeoutConfig.retry,
      modelName: this.modelName,
      ...config
    };

    // Initialize ModelManager with v3
    this.modelManager = new ModelManager('v3');

    // Create custom HTTPS agent with longer timeout
    const agent = new https.Agent({
      keepAlive: true,
      timeout: this.timeoutConfig.socket,
      scheduling: 'fifo',
      maxSockets: 100,
      maxFreeSockets: 10,
      freeSocketTimeout: this.timeoutConfig.socket
    });

    // Configure axios instance with proper timeout hierarchy
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept-Encoding': 'gzip,deflate,br'
      },
      timeout: this.timeoutConfig.request,
      httpAgent: agent,
      httpsAgent: agent,
      decompress: true,
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024,
      validateStatus: status => status >= 200 && status < 300
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      response => {
        const responseTime = Date.now() - response.config.metadata.startTime;
        logger.debug('DeepSeek API response:', {
          status: response.status,
          dataSize: JSON.stringify(response.data).length,
          responseTime,
          timeoutConfig: this.timeoutConfig
        });
        return response;
      },
      error => {
        const responseTime = Date.now() - (error.config?.metadata?.startTime || Date.now());
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          logger.error('DeepSeek API timeout:', {
            timeout: this.timeoutConfig.request,
            responseTime,
            url: error.config?.url,
            timeoutConfig: this.timeoutConfig,
            error: {
              code: error.code,
              message: error.message,
              stack: error.stack
            }
          });
          throw new Error(`Request timeout after ${responseTime}ms (limit: ${this.timeoutConfig.request}ms)`);
        }
        logger.error('DeepSeek API error:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          responseTime,
          timeoutConfig: this.timeoutConfig,
          stack: error.stack
        });
        throw error;
      }
    );

    // Add request interceptor to track timing and log request details
    this.client.interceptors.request.use(
      config => {
        config.metadata = { startTime: Date.now() };
        logger.debug('Making DeepSeek API request:', {
          url: config.url,
          method: config.method,
          timeoutConfig: this.timeoutConfig,
          headers: {
            ...config.headers,
            Authorization: 'Bearer [REDACTED]'
          }
        });
        return config;
      },
      error => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    logger.info('DeepSeek service initialized with configuration:', {
      timeoutConfig: this.timeoutConfig,
      config: {
        ...this.config,
        apiKey: '[REDACTED]'
      }
    });
  }

  /**
   * Validate article input
   * @private
   */
  validateArticleInput(article) {
    if (!article) {
      throw new Error('Article is required');
    }
    if (!article.content) {
      throw new Error('Article content is required');
    }
    if (typeof article.content !== 'string') {
      throw new Error('Article content must be a string');
    }
    // Optional fields validation
    if (article.title && typeof article.title !== 'string') {
      throw new Error('Article title must be a string');
    }
    if (article.url && typeof article.url !== 'string') {
      throw new Error('Article URL must be a string');
    }
  }

  /**
   * Analyze article content using DeepSeek API
   * @param {Object} article - Article object containing content to analyze
   * @returns {Promise<Object>} - Analyzed content in our standard format
   */
  async analyzeContent(article) {
    try {
      // Validate input first
      this.validateArticleInput(article);
      
      const response = await this.makeRequest(article);
      
      // Extract and validate the content
      const content = this.extractContent(response);
      
      // Parse and validate the JSON
      const jsonData = this.extractJSON(content);
      
      // Validate the analysis structure
      const validatedAnalysis = this.validateAnalysis(jsonData);
      
      // Transform to our standard format
      return this.transformResponse(validatedAnalysis);
    } catch (error) {
      if (this.shouldRetry(error)) {
        return this.retryAnalysis(article);
      }
      throw error;
    }
  }

  /**
   * Extract content from API response
   * @private
   */
  extractContent(response) {
    try {
      logger.debug('Extracting content from response:', {
        hasData: !!response.data,
        hasChoices: !!response.data?.choices,
        choicesLength: response.data?.choices?.length,
        firstChoice: response.data?.choices?.[0] ? {
          hasMessage: !!response.data.choices[0].message,
          messageType: typeof response.data.choices[0].message,
          hasContent: !!response.data.choices[0].message?.content
        } : null
      });

      if (!response.data) {
        throw new Error('Empty response from DeepSeek API');
      }

      if (!response.data.choices || !Array.isArray(response.data.choices) || response.data.choices.length === 0) {
        logger.error('Invalid choices in response:', {
          data: response.data,
          choices: response.data?.choices
        });
        throw new Error('No choices in response');
      }

      const firstChoice = response.data.choices[0];
      if (!firstChoice.message || !firstChoice.message.content) {
        logger.error('Invalid message structure:', {
          firstChoice,
          message: firstChoice?.message
        });
        throw new Error('Invalid message structure in response');
      }

      const content = firstChoice.message.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw new Error('Empty or invalid content in response');
      }

      logger.debug('Successfully extracted content:', {
        contentLength: content.length,
        contentPreview: content.slice(0, 100) + '...',
        isJson: content.trim().startsWith('{') && content.trim().endsWith('}')
      });

      return content;
    } catch (error) {
      logger.error('Failed to extract content:', {
        error: error.message,
        response: response?.data ? JSON.stringify(response.data).slice(0, 500) : 'No response data'
      });
      throw new Error(`Failed to extract content: ${error.message}`);
    }
  }

  /**
   * Extract and clean JSON from response text
   * @private
   */
  extractJSON(text) {
    try {
      logger.debug('Attempting to parse JSON:', {
        textLength: text.length,
        isString: typeof text === 'string',
        startsWithBrace: text.trim().startsWith('{'),
        endsWithBrace: text.trim().endsWith('}')
      });

      // First try direct JSON parse
      const parsed = JSON.parse(text);
      
      logger.debug('Successfully parsed JSON:', {
        hasSentiment: !!parsed.sentiment,
        hasMarketAnalysis: !!parsed.marketAnalysis,
        hasConfidence: typeof parsed.confidence === 'number'
      });

      return parsed;
    } catch (e) {
      logger.error('Failed to parse JSON:', {
        error: e.message,
        textPreview: text.slice(0, 200) + '...'
      });
      throw new Error('Failed to parse response as JSON');
    }
  }

  /**
   * Validate analysis JSON structure
   * @private
   */
  validateAnalysis(analysis) {
    const requiredFields = {
      sentiment: ['label', 'score'],
      marketAnalysis: {
        overview: ['summary', 'keyMetrics'],
        catalysts: ['primary', 'secondary', 'context'],
        sectorImpacts: ['sector', 'impact', 'keyStocks'],
        tradingImplications: {
          shortTerm: ['outlook', 'keyLevels', 'tradingStrategy', 'risks'],
          longTerm: ['outlook', 'keyFactors', 'investmentThesis']
        }
      },
      confidence: null
    };

    try {
      // Check top-level structure
      if (!analysis || typeof analysis !== 'object') {
        throw new Error('Analysis must be an object');
      }

      // Validate sentiment
      if (!analysis.sentiment || typeof analysis.sentiment !== 'object') {
        throw new Error('Missing or invalid sentiment object');
      }
      if (!['positive', 'negative', 'neutral'].includes(analysis.sentiment.label)) {
        throw new Error('Invalid sentiment label');
      }
      if (typeof analysis.sentiment.score !== 'number' || analysis.sentiment.score < 0 || analysis.sentiment.score > 1) {
        throw new Error('Invalid sentiment score');
      }

      // Validate market analysis
      if (!analysis.marketAnalysis || typeof analysis.marketAnalysis !== 'object') {
        throw new Error('Missing or invalid marketAnalysis object');
      }

      // Validate overview
      const overview = analysis.marketAnalysis.overview;
      if (!overview || typeof overview !== 'object') {
        throw new Error('Missing or invalid overview object');
      }
      if (typeof overview.summary !== 'string' || !Array.isArray(overview.keyMetrics)) {
        throw new Error('Invalid overview structure');
      }

      // Validate catalysts
      const catalysts = analysis.marketAnalysis.catalysts;
      if (!catalysts || typeof catalysts !== 'object') {
        throw new Error('Missing or invalid catalysts object');
      }
      if (typeof catalysts.primary !== 'string' || !Array.isArray(catalysts.secondary) || typeof catalysts.context !== 'string') {
        throw new Error('Invalid catalysts structure');
      }

      // Validate sector impacts
      if (!Array.isArray(analysis.marketAnalysis.sectorImpacts)) {
        throw new Error('sectorImpacts must be an array');
      }
      analysis.marketAnalysis.sectorImpacts.forEach((impact, index) => {
        if (!impact.sector || !impact.impact || !Array.isArray(impact.keyStocks)) {
          throw new Error(`Invalid sector impact at index ${index}`);
        }
      });

      // Validate trading implications
      const implications = analysis.marketAnalysis.tradingImplications;
      if (!implications || typeof implications !== 'object') {
        throw new Error('Missing or invalid tradingImplications object');
      }

      // Validate short term
      const shortTerm = implications.shortTerm;
      if (!shortTerm || typeof shortTerm !== 'object') {
        throw new Error('Missing or invalid shortTerm object');
      }
      if (typeof shortTerm.outlook !== 'string' || !Array.isArray(shortTerm.keyLevels) ||
          typeof shortTerm.tradingStrategy !== 'string' || !Array.isArray(shortTerm.risks)) {
        throw new Error('Invalid shortTerm structure');
      }

      // Validate long term
      const longTerm = implications.longTerm;
      if (!longTerm || typeof longTerm !== 'object') {
        throw new Error('Missing or invalid longTerm object');
      }
      if (typeof longTerm.outlook !== 'string' || !Array.isArray(longTerm.keyFactors) ||
          typeof longTerm.investmentThesis !== 'string') {
        throw new Error('Invalid longTerm structure');
      }

      // Validate confidence
      if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 1) {
        throw new Error('Invalid confidence value');
      }

      return analysis;
    } catch (error) {
      logger.error('Analysis validation failed:', {
        error: error.message,
        analysis: JSON.stringify(analysis, null, 2)
      });
      throw new Error(`Invalid analysis structure: ${error.message}`);
    }
  }

  /**
   * Validate the API response
   * @private
   */
  validateResponse(response) {
    try {
      logger.debug('Validating response:', {
        responseStructure: {
          hasChoices: !!response.choices,
          hasMessage: !!response.choices?.[0]?.message,
          responseType: typeof response
        }
      });

      if (!response.choices || !response.choices[0]?.message?.content) {
        logger.error('Invalid API response:', {
          response: JSON.stringify(response, null, 2).slice(0, 500),
          hasChoices: !!response.choices,
          firstChoice: response.choices?.[0],
          messageContent: response.choices?.[0]?.message?.content
        });
        throw new Error('Invalid response structure');
      }

      const content = response.choices[0].message.content;

      logger.debug('Extracted content:', { 
        contentPreview: content.slice(0, 200) + '...',
        contentLength: content.length
      });

      return this.extractJSON(content);
    } catch (error) {
      logger.error('Response validation failed:', {
        error: error.message,
        stack: error.stack,
        response: JSON.stringify(response, null, 2).slice(0, 500)
      });
      throw error;
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
  async retryAnalysis(article, attempt = 1) {
    if (attempt > this.config.retryAttempts) {
      throw new Error(`Max retry attempts reached (${this.config.retryAttempts})`);
    }

    const delay = Math.min(
      this.config.retryDelay * Math.pow(2, attempt - 1),
      this.config.timeout / 2
    );
    await new Promise(resolve => setTimeout(resolve, delay));

    logger.info(`Retrying analysis (attempt ${attempt}/${this.config.retryAttempts})`, {
      delay,
      attempt,
      maxAttempts: this.config.retryAttempts
    });
    
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
      data: error.response?.data,
      headers: error.response?.headers
    };

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      logger.error('Request timeout or aborted:', errorDetails);
      return new Error(`Request timeout after ${this.config.timeout}ms`);
    }

    if (error.response?.status === 429) {
      logger.error('Rate limit exceeded:', errorDetails);
      return new Error('Rate limit exceeded');
    }

    if (error.response?.status >= 500) {
      logger.error('Server error:', errorDetails);
      return new Error(`Server error: ${error.response?.data?.message || error.message}`);
    }

    logger.error('Unexpected error:', errorDetails);
    return error;
  }

  /**
   * Make API request to DeepSeek with proper timeout handling
   * @private
   */
  async makeRequest(article) {
    let requestParams;
    let currentConfig;
    const endpoint = '/chat/completions';
    
    try {
      currentConfig = this.modelManager.getCurrentConfig();
      const prompt = this.buildPrompt(article);
      
      requestParams = {
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: this.modelName,
        max_tokens: 2048,
        temperature: 0.1,
        top_p: 0.95,
        stream: false,
        response_format: { type: "json_object" }
      };

      logger.debug('Sending request to DeepSeek API:', {
        endpoint: `${this.baseUrl}${endpoint}`,
        modelName: this.modelName,
        requestSize: JSON.stringify(requestParams).length,
        timeoutConfig: this.timeoutConfig,
        articleInfo: {
          title: article.title,
          contentLength: article.content.length,
          hasUrl: !!article.url
        }
      });

      const response = await this.client.post(endpoint, requestParams);

      logger.debug('Received response from DeepSeek API:', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        dataType: typeof response.data,
        responseTime: Date.now() - response.config.metadata.startTime
      });

      return response;
    } catch (error) {
      logger.error('API request failed:', {
        error: {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText
        },
        endpoint: `${this.baseUrl}${endpoint}`,
        responseData: error.response?.data,
        timeoutConfig: this.timeoutConfig
      });

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
}

export default DeepSeekService;