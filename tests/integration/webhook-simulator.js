const axios = require('axios');

async function simulateChangeDetection() {
  const testPayload = {
    url: "https://tradingeconomics.com/united-states/news",
    timestamp: new Date().toISOString(),
    diff: "<div>New economic data released</div>",
    selector: ".news-article",
    content: {
      title: "Test Economic News",
      text: "A".repeat(200), // Meets minimum length requirement
      published_date: new Date().toISOString()
    }
  };

  try {
    console.log('🚀 Sending test webhook...');
    const response = await axios.post('http://localhost:3000/webhook', testPayload);
    console.log('✅ Response:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
simulateChangeDetection(); 