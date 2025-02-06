const express = require('express');
const bodyParser = require('body-parser');
const { EnhancedWebhookHandler } = require('../handlers/webhook-handler');

const app = express();
app.use(bodyParser.json());

const webhookHandler = new EnhancedWebhookHandler();

app.post('/webhook', async (req, res) => {
  try {
    const result = await webhookHandler.validateChange(req.body);
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook test server running on http://localhost:${PORT}`);
}); 