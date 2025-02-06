import { Investing11Service } from './news/investing11';

// ... existing imports ...

export async function initializeServices() {
  try {
    // ... existing initialization code ...

    // Initialize Investing11 service
    const investing11Service = Investing11Service.getInstance();
    investing11Service.startNewsPolling();

    console.log('Services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
} 