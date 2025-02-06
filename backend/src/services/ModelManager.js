import { getModelConfig, validateModelParams } from '../config/models.js';
import logger from '../logger.js';

class ModelManager {
  constructor(defaultVersion = 'v3') {
    this.setModel(defaultVersion);
  }

  /**
   * Set the active model version
   * @param {string} version - Model version to use
   * @param {Object} customParams - Optional custom parameters for this model
   */
  setModel(version, customParams = {}) {
    const config = getModelConfig(version);
    
    // Merge default params with custom params
    const params = {
      ...config.defaultParams,
      ...customParams
    };

    // Validate the merged parameters
    const errors = validateModelParams(version, params);
    if (errors.length > 0) {
      throw new Error(`Invalid model parameters: ${errors.join(', ')}`);
    }

    this.currentVersion = version;
    this.currentConfig = config;
    this.currentParams = params;

    logger.info('Model configuration updated', {
      version,
      model: config.name,
      params: this.currentParams,
      capabilities: config.capabilities
    });
  }

  /**
   * Get current model configuration
   */
  getCurrentConfig() {
    return {
      version: this.currentVersion,
      ...this.currentConfig,
      params: this.currentParams
    };
  }

  /**
   * Update model parameters
   * @param {Object} params - New parameters to merge with existing ones
   */
  updateParams(params) {
    const newParams = {
      ...this.currentParams,
      ...params
    };

    const errors = validateModelParams(this.currentVersion, newParams);
    if (errors.length > 0) {
      throw new Error(`Invalid model parameters: ${errors.join(', ')}`);
    }

    this.currentParams = newParams;
    logger.info('Model parameters updated', {
      version: this.currentVersion,
      params: this.currentParams
    });
  }

  /**
   * Check if current model supports a specific capability
   * @param {string} capability - Capability to check for
   */
  supportsCapability(capability) {
    return this.currentConfig.capabilities.includes(capability);
  }

  /**
   * Get parameters for API request
   * @param {Object} overrides - Optional parameter overrides for this request
   */
  getRequestParams(overrides = {}) {
    const params = {
      ...this.currentParams,
      ...overrides,
      model: this.currentConfig.name
    };

    const errors = validateModelParams(this.currentVersion, params);
    if (errors.length > 0) {
      throw new Error(`Invalid request parameters: ${errors.join(', ')}`);
    }

    return params;
  }
}

export default ModelManager; 