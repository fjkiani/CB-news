const NewsCategory = require('../models/NewsCategory');
const NewsClassification = require('../models/NewsClassification');

class NewsClassificationService {
  constructor() {
    this.categories = new Map();
    this.classifications = new Map();
    this.lastUpdate = null;
    this.updateInterval = 5 * 60 * 1000; // 5 minutes
  }

  async loadClassifications() {
    if (this.lastUpdate && Date.now() - this.lastUpdate < this.updateInterval) {
      return;
    }

    try {
      // Load active categories
      const categories = await NewsCategory.find({ isActive: true });
      this.categories.clear();
      categories.forEach(cat => {
        this.categories.set(cat.type, {
          keywords: cat.keywords,
          weight: cat.weight
        });
      });

      // Load active classifications
      const classifications = await NewsClassification.find({ isActive: true });
      this.classifications.clear();
      classifications.forEach(class => {
        this.classifications.set(class.name, {
          threshold: class.threshold,
          importance: class.importance
        });
      });

      this.lastUpdate = Date.now();
    } catch (error) {
      logger.error('Failed to load classifications:', error);
    }
  }

  async determineNewsType(content) {
    await this.loadClassifications();
    const lowerContent = content.toLowerCase();

    for (const [type, data] of this.categories.entries()) {
      if (data.keywords.some(keyword => lowerContent.includes(keyword))) {
        return type;
      }
    }
    return 'GENERAL';
  }

  async calculateImportance(content, metadata) {
    await this.loadClassifications();
    let score = 1;

    for (const [name, data] of this.classifications.entries()) {
      if (this.meetsClassification(content, metadata, name, data)) {
        score += data.importance;
      }
    }

    return Math.min(score, 5);
  }

  meetsClassification(content, metadata, name, data) {
    // Implementation specific to each classification type
    switch (name) {
      case 'MARKET_MOVER':
        return metadata.percentageChanges.some(p => 
          Math.abs(parseFloat(p)) >= data.threshold
        );
      case 'FED_NEWS':
        return content.toLowerCase().includes('fed') || 
               content.toLowerCase().includes('federal reserve');
      // Add more classification types as needed
      default:
        return false;
    }
  }
}

module.exports = new NewsClassificationService(); 