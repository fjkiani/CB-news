const axios = require('axios');

async function simulateChangeDetection() {
  // Valid payload
  const validPayload = {
    url: "https://tradingeconomics.com/united-states/news",
    timestamp: new Date().toISOString(),
    diff: "<div>New economic data released</div>",
    selector: ".news-article",
    content: {
      title: "Test Economic News",
      text: "A".repeat(200),
      published_date: new Date().toISOString()
    }
  };

  // Invalid payload (for testing validation)
  const invalidPayload = {
    url: "https://invalid-url.com",
    timestamp: "invalid-date",
    content: {
      text: "Too short"
    }
  };

  try {
    console.log('🧪 Testing valid payload...');
    const validResponse = await axios.post('http://localhost:3000/webhook', validPayload);
    console.log('\n✅ Valid payload response:', JSON.stringify(validResponse.data, null, 2));

    console.log('\n🧪 Testing invalid payload...');
    await axios.post('http://localhost:3000/webhook', invalidPayload);
  } catch (error) {
    if (error.response) {
      console.log('\n❌ Invalid payload response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('\n❌ Error:', error.message);
    }
  }
}

simulateChangeDetection();
