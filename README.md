# Web Scraping Application with Diffbot

A robust web scraping application that extracts, processes, and stores structured data from websites using Diffbot's API.

## Features

- 🔄 Real-time web scraping using Diffbot's Analyze API
- 💾 Data persistence with Supabase
- 🎯 Content deduplication and validation
- 📊 Sentiment analysis and categorization
- 🚀 Caching for improved performance
- 📝 Comprehensive logging

## Prerequisites

- Node.js (v14 or higher)
- Supabase account
- Diffbot API key
- Redis (optional, for caching)

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd <your-repo-name>
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Required environment variables:
```
DIFFBOT_TOKEN=your_diffbot_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
REDIS_URL=your_redis_url (optional)
```

## Project Structure

```
├── src/
│   ├── scraper.js          # Main scraping logic
│   ├── services/
│   │   ├── storage/        # Database interactions
│   │   └── cache/          # Caching logic
│   ├── config/            
│   │   └── diffbot.js      # Diffbot configuration
│   └── logger.js           # Logging configuration
├── api/
│   └── routes/
│       └── scraper.js      # API endpoints
└── tests/
```

## Core Components

### 1. Scraper Service

The scraper service handles:
- Content extraction via Diffbot
- Data processing and normalization
- Deduplication
- Metadata enrichment

Example implementation:
```javascript
async function scrapeNews(forceFresh = false) {
  // See scraper.js for full implementation
}
```

### 2. Storage Service

Handles data persistence using Supabase:
- Article storage
- Retrieval
- Caching

### 3. API Endpoints

Available endpoints:
- GET `/api/scrape/:source` - Trigger scraping for a specific source
- GET `/api/articles` - Retrieve stored articles

## Usage

1. Start the server:
```bash
npm start
```

2. Trigger a scrape:
```bash
curl http://localhost:3001/api/scrape/your-source?fresh=true
```

3. Retrieve articles:
```bash
curl http://localhost:3001/api/articles
```

## Database Schema

```sql
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  source TEXT,
  category TEXT,
  sentiment_score FLOAT,
  sentiment_label TEXT,
  sentiment_confidence FLOAT,
  summary TEXT,
  author TEXT,
  raw_data JSONB
);
```

## Extending the Application

### Adding a New Source

1. Create a new scraper configuration:
```javascript
// config/sources/new-source.js
module.exports = {
  url: 'https://your-source-url.com',
  selectors: {
    article: '.article-class',
    title: '.title-class',
    content: '.content-class'
  }
};
```

2. Add the source to the API routes:
```javascript
router.get('/api/scrape/new-source', handleScrape);
```

### Custom Processing

Add custom processing logic in `services/processors/`:
```javascript
// services/processors/custom-processor.js
function processArticle(rawData) {
  // Your custom processing logic
  return processedData;
}
```

## Error Handling

The application includes comprehensive error handling:
- API errors
- Scraping failures
- Storage issues
- Invalid data

## Monitoring and Logging

Logging is implemented using a custom logger:
- Info level for normal operations
- Error level for issues
- Debug level for detailed information

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 