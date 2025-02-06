import axios from 'axios';

const INVESTING11_API_KEY = 'a5c0896b36mshaa509a779a23bb6p181f51jsna75ba55edc97';
const INVESTING11_API_HOST = 'investing11.p.rapidapi.com';

interface Investing11News {
  // We'll need to define the response type based on the API response
  // Add proper types once we see the actual response
  [key: string]: any;
}

export class Investing11Service {
  private static instance: Investing11Service;
  
  private constructor() {}

  static getInstance(): Investing11Service {
    if (!this.instance) {
      this.instance = new Investing11Service();
    }
    return this.instance;
  }

  async searchNews(query: string): Promise<Investing11News[]> {
    try {
      const response = await axios.get(`https://${INVESTING11_API_HOST}/search_news`, {
        params: { query },
        headers: {
          'x-rapidapi-key': INVESTING11_API_KEY,
          'x-rapidapi-host': INVESTING11_API_HOST
        }
      });

      console.log('Investing11 API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch news from Investing11:', error);
      throw error;
    }
  }

  isMarketHours(): boolean {
    const now = new Date();
    const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hours = nyTime.getHours();
    const minutes = nyTime.getMinutes();
    const day = nyTime.getDay();

    // Check if it's a weekday (Monday-Friday)
    if (day === 0 || day === 6) return false;

    // Check if it's between 9:30 AM and 4:00 PM ET
    const marketOpen = hours > 9 || (hours === 9 && minutes >= 30);
    const marketClose = hours < 16;

    return marketOpen && marketClose;
  }

  async startNewsPolling() {
    const pollNews = async () => {
      if (this.isMarketHours()) {
        try {
          // You can customize the search queries based on your needs
          const queries = ['market', 'stocks', 'economy', 'trump'];
          
          for (const query of queries) {
            const news = await this.searchNews(query);
            // Process and store the news
            // You'll need to implement this based on your requirements
            console.log(`Fetched ${news.length} articles for query: ${query}`);
          }
        } catch (error) {
          console.error('Error polling news:', error);
        }
      } else {
        console.log('Outside market hours, skipping news poll');
      }
    };

    // Initial poll
    await pollNews();

    // Set up 5-minute interval
    setInterval(pollNews, 5 * 60 * 1000);
  }
} 