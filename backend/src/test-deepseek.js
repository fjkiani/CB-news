import { DeepSeekService } from './services/DeepSeekService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDeepSeek() {
  try {
    console.log('Initializing DeepSeek service...');
    const service = new DeepSeekService({
      modelVersion: 'v3',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    });

    console.log('\nTesting financial article analysis...');
    const article = {
      title: 'Tech Stocks Rally as Fed Signals Rate Cut Plans',
      content: `Major tech stocks surged today after Federal Reserve comments suggested potential rate cuts later this year. 
      The Nasdaq Composite rose 2.1%, led by gains in semiconductor and software companies. 
      Apple gained 3.2% while Microsoft added 2.8%. 
      The Fed's dovish stance on future rate policy boosted growth stocks, which are particularly sensitive to interest rates. 
      Market analysts expect continued momentum in the tech sector, though some warn of potential volatility ahead.`,
      url: 'https://example.com/tech-rally'
    };

    const analysis = await service.analyzeArticle(article);
    console.log('\nAnalysis Result:');
    console.log(JSON.stringify(analysis, null, 2));

  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testDeepSeek(); 