import logger from '../logger.js';

class MetricExtractionService {
  constructor() {
    // Common financial metrics patterns
    this.metricPatterns = {
      percentage: /(?:(?:increased|decreased|rose|fell|gained|lost|up|down|by|at|to)\s+)?(\d+(?:\.\d+)?%)/i,
      priceChange: /\$(\d+(?:\.\d+)?)\s*(?:to|from)?\s*\$?(\d+(?:\.\d+)?)/,
      marketCap: /(?:market (?:cap|capitalization|value) of )?\$(\d+(?:\.\d+)?)\s*(?:billion|million|trillion|B|M|T)/i,
      volume: /(?:volume of )?(\d+(?:\.\d+)?)\s*(?:million|billion|trillion|M|B|T)\s*(?:shares|trades|transactions)/i,
      ratio: /(?:ratio of |P\/E of |multiple of )(\d+(?:\.\d+)?)/i
    };

    // Value multipliers for converting to standard units
    this.multipliers = {
      'trillion': 1e12,
      'billion': 1e9,
      'million': 1e6,
      'T': 1e12,
      'B': 1e9,
      'M': 1e6
    };

    // Trend keywords for context
    this.trendKeywords = {
      positive: ['increase', 'gain', 'rise', 'up', 'higher', 'growth', 'improved', 'boost', 'surged'],
      negative: ['decrease', 'loss', 'fall', 'down', 'lower', 'decline', 'reduced', 'dropped', 'slump']
    };
  }

  /**
   * Extract metrics from content
   * @param {string} content - Article content
   * @returns {Object} Extracted and validated metrics
   */
  async extractMetrics(content) {
    try {
      logger.debug('Starting metric extraction', { contentLength: content.length });

      const metrics = {
        percentages: this.extractPercentages(content),
        priceChanges: this.extractPriceChanges(content),
        marketCaps: this.extractMarketCaps(content),
        volumes: this.extractVolumes(content),
        ratios: this.extractRatios(content),
        trends: this.extractTrends(content)
      };

      // Validate and normalize metrics
      const validatedMetrics = this.validateMetrics(metrics);

      logger.info('Metric extraction complete', {
        percentagesFound: validatedMetrics.percentages.length,
        priceChangesFound: validatedMetrics.priceChanges.length,
        marketCapsFound: validatedMetrics.marketCaps.length,
        volumesFound: validatedMetrics.volumes.length,
        ratiosFound: validatedMetrics.ratios.length,
        trendsFound: validatedMetrics.trends.length
      });

      return validatedMetrics;
    } catch (error) {
      logger.error('Metric extraction failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Extract percentage changes
   * @private
   */
  extractPercentages(content) {
    const percentages = [];
    const pattern = this.metricPatterns.percentage;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        // Get surrounding context (50 chars before and after)
        const start = Math.max(0, match.index - 50);
        const end = Math.min(content.length, match.index + match[0].length + 50);
        const context = content.slice(start, end).trim();

        percentages.push({
          value,
          unit: '%',
          context,
          trend: this.detectTrend(context)
        });
      }
      // Move the search position to avoid infinite loop
      pattern.lastIndex = match.index + 1;
    }

    return percentages;
  }

  /**
   * Extract price changes
   * @private
   */
  extractPriceChanges(content) {
    const priceChanges = [];
    const pattern = this.metricPatterns.priceChange;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const fromPrice = parseFloat(match[1]);
      const toPrice = parseFloat(match[2]);
      
      if (!isNaN(fromPrice) && !isNaN(toPrice)) {
        const context = content.slice(
          Math.max(0, match.index - 50),
          Math.min(content.length, match.index + match[0].length + 50)
        ).trim();

        priceChanges.push({
          from: fromPrice,
          to: toPrice,
          change: toPrice - fromPrice,
          percentChange: ((toPrice - fromPrice) / fromPrice) * 100,
          context,
          trend: this.detectTrend(context)
        });
      }
      pattern.lastIndex = match.index + 1;
    }

    return priceChanges;
  }

  /**
   * Extract market capitalizations
   * @private
   */
  extractMarketCaps(content) {
    const marketCaps = [];
    const pattern = this.metricPatterns.marketCap;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const value = parseFloat(match[1]);
      const unit = match[0].match(/(billion|million|trillion|B|M|T)/i)?.[0];
      
      if (!isNaN(value) && unit) {
        const normalizedValue = value * (this.multipliers[unit] || 1);
        const context = content.slice(
          Math.max(0, match.index - 50),
          Math.min(content.length, match.index + match[0].length + 50)
        ).trim();

        marketCaps.push({
          value: normalizedValue,
          originalValue: value,
          unit,
          context
        });
      }
      pattern.lastIndex = match.index + 1;
    }

    return marketCaps;
  }

  /**
   * Extract trading volumes
   * @private
   */
  extractVolumes(content) {
    const volumes = [];
    const pattern = this.metricPatterns.volume;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const value = parseFloat(match[1]);
      const unit = match[0].match(/(million|billion|trillion|M|B|T)/i)?.[0];
      
      if (!isNaN(value) && unit) {
        const normalizedValue = value * (this.multipliers[unit] || 1);
        const context = content.slice(
          Math.max(0, match.index - 50),
          Math.min(content.length, match.index + match[0].length + 50)
        ).trim();

        volumes.push({
          value: normalizedValue,
          originalValue: value,
          unit,
          context
        });
      }
      pattern.lastIndex = match.index + 1;
    }

    return volumes;
  }

  /**
   * Extract financial ratios
   * @private
   */
  extractRatios(content) {
    const ratios = [];
    const pattern = this.metricPatterns.ratio;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        const context = content.slice(
          Math.max(0, match.index - 50),
          Math.min(content.length, match.index + match[0].length + 50)
        ).trim();

        ratios.push({
          value,
          context
        });
      }
      pattern.lastIndex = match.index + 1;
    }

    return ratios;
  }

  /**
   * Extract market trends
   * @private
   */
  extractTrends(content) {
    const trends = [];
    const sentences = content.split(/[.!?]+/);

    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      
      // Check for trend keywords
      for (const [direction, keywords] of Object.entries(this.trendKeywords)) {
        const found = keywords.some(keyword => lowerSentence.includes(keyword));
        if (found) {
          trends.push({
            direction,
            context: sentence.trim()
          });
          break;
        }
      }
    });

    return trends;
  }

  /**
   * Detect trend direction from context
   * @private
   */
  detectTrend(context) {
    const lowerContext = context.toLowerCase();
    
    for (const [direction, keywords] of Object.entries(this.trendKeywords)) {
      if (keywords.some(keyword => lowerContext.includes(keyword))) {
        return direction;
      }
    }
    
    return 'neutral';
  }

  /**
   * Validate extracted metrics
   * @private
   */
  validateMetrics(metrics) {
    const validated = { ...metrics };

    // Filter out invalid percentages (e.g., > 100% for most cases)
    validated.percentages = validated.percentages.filter(p => 
      p.value >= -100 && p.value <= 1000
    );

    // Filter out invalid price changes (e.g., negative prices)
    validated.priceChanges = validated.priceChanges.filter(p => 
      p.from > 0 && p.to > 0
    );

    // Filter out invalid market caps (e.g., too small or too large)
    validated.marketCaps = validated.marketCaps.filter(m => 
      m.value >= 1e6 && m.value <= 3e12
    );

    // Filter out invalid volumes (e.g., negative or zero)
    validated.volumes = validated.volumes.filter(v => 
      v.value > 0
    );

    // Filter out invalid ratios (e.g., negative or extremely high)
    validated.ratios = validated.ratios.filter(r => 
      r.value > 0 && r.value <= 100
    );

    return validated;
  }
}

export default MetricExtractionService; 