/**
 * DeepSeek model configurations
 */
export const MODEL_CONFIGS = {
  'v3': {
    name: 'deepseek-ai/DeepSeek-V3',
    defaultParams: {
      max_tokens: 1024,
      temperature: 0.1,
      top_p: 0.9,
      stream: false
    },
    capabilities: ['chat', 'analysis', 'coding'],
    contextWindow: 8192
  },
  'r1': {
    name: 'deepseek-ai/DeepSeek-R1',
    defaultParams: {
      max_tokens: 2048,
      temperature: 0.3,
      top_p: 0.95,
      stream: false
    },
    capabilities: ['chat', 'analysis', 'coding', 'reasoning'],
    contextWindow: 16384
  },
  'r1-zero': {
    name: 'deepseek-ai/DeepSeek-R1-Zero',
    defaultParams: {
      max_tokens: 4096,
      temperature: 0.1,
      top_p: 1.0,
      stream: false
    },
    capabilities: ['chat', 'analysis', 'coding', 'reasoning', 'zero-shot'],
    contextWindow: 32768
  }
};

/**
 * Get model configuration by version
 */
export function getModelConfig(version) {
  const config = MODEL_CONFIGS[version];
  if (!config) {
    throw new Error(`Unsupported model version: ${version}. Available versions: ${Object.keys(MODEL_CONFIGS).join(', ')}`);
  }
  return config;
}

/**
 * Get all available model versions
 */
export function getAvailableModels() {
  return Object.keys(MODEL_CONFIGS);
}

/**
 * Validate model parameters against model constraints
 */
export function validateModelParams(version, params) {
  const config = getModelConfig(version);
  const errors = [];

  if (params.max_tokens > config.contextWindow) {
    errors.push(`max_tokens (${params.max_tokens}) exceeds model context window (${config.contextWindow})`);
  }

  if (params.temperature < 0 || params.temperature > 1) {
    errors.push(`temperature (${params.temperature}) must be between 0 and 1`);
  }

  if (params.top_p < 0 || params.top_p > 1) {
    errors.push(`top_p (${params.top_p}) must be between 0 and 1`);
  }

  return errors;
} 