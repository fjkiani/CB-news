import axios, { AxiosError } from 'axios';

export async function analyzeMarketImpact(content: string) {
  try {
    console.log('Attempting to connect to:', `${import.meta.env.VITE_SCRAPER_API_URL}/api/analysis/market-impact`);
    
    const response = await axios.post(
      `${import.meta.env.VITE_SCRAPER_API_URL}/api/analysis/market-impact`,
      { content },
      { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    return {
      shortTerm: {
        description: response.data.analysis || 'Analysis pending...',
        confidence: response.data.confidence || 0,
        affectedSectors: []
      },
      longTerm: {
        description: "Long-term analysis in development",
        confidence: 0.6,
        potentialRisks: []
      }
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error Details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        endpoint: error.config?.url
      });
    }
    
    return {
      shortTerm: {
        description: "Unable to analyze market impact at this time",
        confidence: 0,
        affectedSectors: []
      },
      longTerm: {
        description: "Analysis temporarily unavailable",
        confidence: 0,
        potentialRisks: []
      }
    };
  }
}