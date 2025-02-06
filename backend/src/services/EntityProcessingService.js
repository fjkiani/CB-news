import logger from '../logger.js';

class EntityProcessingService {
  constructor() {
    // Common company suffixes to help identify company names
    this.companySuffixes = new Set([
      'Inc', 'Corp', 'Ltd', 'LLC', 'PLC', 'AG', 'SA', 'NV', 'SE',
      'Limited', 'Corporation', 'Incorporated', 'Company', 'Holdings',
      'Technologies', 'Solutions', 'Group', 'International'
    ]);

    // Major market sectors
    this.sectorMap = {
      'Technology': ['software', 'hardware', 'semiconductor', 'cloud', 'cybersecurity', 'ai', 'artificial intelligence', 'tech'],
      'Healthcare': ['biotech', 'pharmaceutical', 'medical', 'health', 'drug', 'therapeutics', 'healthcare'],
      'Finance': ['bank', 'insurance', 'investment', 'financial', 'fintech', 'payment'],
      'Consumer': ['retail', 'consumer', 'food', 'beverage', 'apparel', 'luxury'],
      'Industrial': ['manufacturing', 'industrial', 'aerospace', 'defense', 'construction'],
      'Energy': ['oil', 'gas', 'renewable', 'solar', 'wind', 'energy'],
      'Materials': ['chemical', 'mining', 'steel', 'metals', 'materials'],
      'Telecom': ['telecommunications', 'wireless', 'broadband', 'telecom'],
      'Real Estate': ['reit', 'property', 'real estate', 'housing'],
      'Utilities': ['utility', 'electric', 'water', 'utilities']
    };

    // Common stock exchanges for validation
    this.stockExchanges = new Set(['NYSE:', 'NASDAQ:', 'AMEX:', 'LSE:', 'TSE:']);
  }

  /**
   * Process entities from the article content
   * @param {string} content - Article content
   * @returns {Object} Processed entities with sectors and relationships
   */
  async processEntities(content) {
    try {
      logger.debug('Starting entity processing', { contentLength: content.length });

      const companies = this.extractCompanies(content);
      const sectors = this.classifySectors(content);
      const relationships = this.findRelationships(companies, content);

      logger.info('Entity processing complete', {
        companiesFound: companies.length,
        sectorsFound: sectors.length,
        relationshipsFound: relationships.length
      });

      return {
        companies,
        sectors,
        relationships
      };
    } catch (error) {
      logger.error('Entity processing failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Extract company names from content
   * @private
   */
  extractCompanies(content) {
    const companies = new Set();
    const words = content.split(/\s+/);
    
    // First pass: Look for company names with suffixes
    for (let i = 0; i < words.length - 1; i++) {
      const word = words[i];
      const nextWord = words[i + 1];
      
      // Check for stock symbols
      if (this.stockExchanges.has(word)) {
        const symbol = nextWord.replace(/[^A-Z]/g, '');
        if (symbol.length >= 2 && symbol.length <= 5) {
          companies.add({ name: symbol, type: 'symbol' });
        }
        continue;
      }

      // Check for company names with suffixes
      if (this.companySuffixes.has(nextWord)) {
        const companyName = word + ' ' + nextWord;
        companies.add({ name: companyName, type: 'company' });
      }
    }

    // Second pass: Look for capitalized sequences that might be company names
    const capitalizedPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?=\s+(?:said|announced|reported|expects|plans|will|has|had|is|was|were))/g;
    const matches = content.match(capitalizedPattern) || [];
    matches.forEach(match => {
      if (match.length > 3 && !companies.has(match)) {
        companies.add({ name: match, type: 'potential' });
      }
    });

    return Array.from(companies);
  }

  /**
   * Classify sectors mentioned in the content
   * @private
   */
  classifySectors(content) {
    const sectors = new Map();
    const lowerContent = content.toLowerCase();

    // Find sector mentions and their context
    for (const [sector, keywords] of Object.entries(this.sectorMap)) {
      const mentions = [];
      
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        let match;
        
        while ((match = regex.exec(content)) !== null) {
          // Get surrounding context (100 chars before and after)
          const start = Math.max(0, match.index - 100);
          const end = Math.min(content.length, match.index + keyword.length + 100);
          const context = content.slice(start, end).trim();
          
          mentions.push({
            keyword,
            context,
            position: match.index
          });
        }
      });

      if (mentions.length > 0) {
        sectors.set(sector, {
          sector,
          mentions: mentions.length,
          context: mentions.map(m => m.context),
          keywords: mentions.map(m => m.keyword)
        });
      }
    }

    return Array.from(sectors.values());
  }

  /**
   * Find relationships between companies
   * @private
   */
  findRelationships(companies, content) {
    const relationships = [];
    const relationshipPatterns = [
      'partnership',
      'acquisition',
      'merger',
      'collaboration',
      'agreement',
      'deal',
      'contract'
    ];

    companies.forEach(company1 => {
      companies.forEach(company2 => {
        if (company1.name === company2.name) return;

        // Look for sentences containing both companies
        const sentences = content.split(/[.!?]+/);
        sentences.forEach(sentence => {
          if (sentence.includes(company1.name) && sentence.includes(company2.name)) {
            // Check for relationship keywords
            const relationship = relationshipPatterns.find(pattern => 
              sentence.toLowerCase().includes(pattern)
            );

            if (relationship) {
              relationships.push({
                company1: company1.name,
                company2: company2.name,
                type: relationship,
                context: sentence.trim()
              });
            }
          }
        });
      });
    });

    return relationships;
  }

  /**
   * Get sector for a company based on context
   * @private
   */
  getCompanySector(companyName, content) {
    const companySentences = content.split(/[.!?]+/).filter(sentence => 
      sentence.includes(companyName)
    );

    const sectorScores = new Map();

    companySentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      
      for (const [sector, keywords] of Object.entries(this.sectorMap)) {
        const score = keywords.reduce((acc, keyword) => {
          return acc + (lowerSentence.includes(keyword) ? 1 : 0);
        }, 0);
        
        if (score > 0) {
          sectorScores.set(sector, (sectorScores.get(sector) || 0) + score);
        }
      }
    });

    // Return the sector with the highest score
    let maxScore = 0;
    let likelySector = null;

    sectorScores.forEach((score, sector) => {
      if (score > maxScore) {
        maxScore = score;
        likelySector = sector;
      }
    });

    return likelySector;
  }
}

export default EntityProcessingService; 