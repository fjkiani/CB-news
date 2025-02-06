import axios from 'axios';
import logger from '../../logger.js';

export class CohereService {
  constructor() {
    this.apiKey = process.env.COHERE_API_KEY;
    if (!this.apiKey) {
      logger.error('No Cohere API key found');
      throw new Error('Cohere API key is required');
    }
    logger.info('CohereService initialized with API key');
  }

  async analyzeArticle({ title, content, classification }) {
    try {
      logger.info('Analyzing article with Cohere:', { title });

      const response = await axios.post('https://api.cohere.ai/v1/generate', {
        model: 'command',
        prompt: this.buildPrompt(title, content, classification),
        max_tokens: 1000,
        temperature: 0.2,  // Reduced for more consistent output
        k: 0,
        stop_sequences: [],  // Removed stop sequence
        return_likelihoods: 'NONE'
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Cohere-Version': '2022-12-06'
        }
      });

      const rawText = response.data.generations[0].text.trim();
      
      // Clean up common JSON issues
      const cleanedText = rawText
        .replace(/,(\s*})/g, '$1')  // Remove trailing commas
        .replace(/,(\s*])/g, '$1')  // Remove trailing commas in arrays
        .replace(/\n/g, '')         // Remove newlines
        .match(/\{.*\}/s)?.[0];     // Extract JSON object
      
      if (!cleanedText) {
        logger.error('No valid JSON found in response:', { rawText });
        throw new Error('No valid JSON found in Cohere response');
      }

      try {
        const analysis = JSON.parse(cleanedText);
        
        // Validate required fields
        if (!analysis.summary || !analysis.marketImpact) {
          throw new Error('Missing required fields in analysis');
        }

        logger.info('Cohere analysis completed:', { 
          title,
          summary: analysis.summary?.substring(0, 100)
        });
        
        return analysis;
      } catch (parseError) {
        logger.error('Failed to parse Cohere response:', {
          error: parseError.message,
          rawText: cleanedText
        });
        throw new Error('Invalid JSON response from Cohere');
      }
    } catch (error) {
      logger.error('Cohere analysis failed:', {
        error: error.message,
        title,
        status: error.response?.status
      });
      throw error;
    }
  }

  buildPrompt(title, content, classification) {
    return `You are a financial news analyst. Analyze this article and provide a structured analysis.

      Article Title: ${title}
      Article Content: ${content}
      Classification: ${JSON.stringify(classification)}

      Provide a concise analysis in this exact JSON format without any additional text or explanation:
      {
        "summary": "2-3 sentence summary",
        "marketImpact": {
          "immediate": "1 sentence on immediate impact",
          "longTerm": "1 sentence on long-term view",
          "affectedSectors": ["sector1", "sector2"]
        },
        "keyPoints": [
          "key point 1",
          "key point 2"
        ],
        "relatedIndicators": [
          "indicator1",
          "indicator2"
        ]
      }`;
  }
}

export default CohereService; 