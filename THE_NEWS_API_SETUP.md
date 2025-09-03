# The News API Setup Guide

This guide will help you set up The News API for the SIRFA Agent Finance application.

## Overview

The News API (https://www.thenewsapi.com/) is now the primary news source for the SIRFA application. It provides:

- **Global News Coverage**: Over 1 million articles added weekly
- **Fast Response Times**: Optimized for performance
- **Free Tier Available**: Get started without cost
- **Financial News Focus**: Automatically filters for finance-related content
- **Multiple Endpoints**: Headlines and search functionality

## Getting Your API Key

1. **Sign Up**: Visit [The News API](https://www.thenewsapi.com/) and create a free account
2. **Get API Token**: After signing up, you'll find your API token on your dashboard
3. **Free Tier**: The free tier provides sufficient requests for development and testing

## Configuration

### Backend Configuration

Add your API key to the backend environment file:

```bash
# In backend/.env
THE_NEWS_API_KEY=your_actual_api_key_here
```

### API Endpoints Used

The application uses two main endpoints from The News API:

1. **Headlines Endpoint**: `GET https://api.thenewsapi.com/v1/news/headlines`
   - Fetches latest headlines by category
   - Automatically filters for finance-related content
   - Parameters: `api_token`, `language=en`, `locale=us`, `headlines_per_category=10`

2. **Search Endpoint**: `GET https://api.thenewsapi.com/v1/news/all`
   - Searches for specific financial terms
   - Used as fallback when no finance news found in headlines
   - Parameters: `api_token`, `search=finance OR stock OR market OR trading OR economy`

## Features

### Automatic Financial News Filtering

The application automatically filters news for financial relevance using keywords:
- Stock market terms: `stock`, `market`, `trading`, `nasdaq`, `dow`, `s&p`
- Economic terms: `economy`, `inflation`, `gdp`, `unemployment`, `fed`
- Corporate terms: `earnings`, `revenue`, `profit`, `ipo`, `merger`
- Crypto terms: `bitcoin`, `ethereum`, `crypto`

### Smart Data Processing

- **Sentiment Analysis**: Automatically analyzes article sentiment (positive/negative/neutral)
- **Impact Assessment**: Determines news impact level (high/medium/low)
- **Ticker Extraction**: Identifies relevant stock tickers in articles
- **Category Mapping**: Maps news categories to financial categories
- **Duplicate Removal**: Removes duplicate articles based on title similarity

### Caching

- **5-minute cache**: News data is cached for 5 minutes to improve performance
- **Fallback system**: If API fails, shows sample news to maintain functionality

## API Response Format

The application transforms The News API data into this standardized format:

```json
{
  "id": "unique_article_id",
  "title": "Article Title",
  "summary": "Article description or snippet",
  "source": "The News API",
  "timestamp": "2025-01-14T10:30:00.000Z",
  "category": "Finance",
  "sentiment": "positive",
  "impact": "high",
  "relevantTickers": ["AAPL", "MSFT"],
  "url": "https://example.com/article"
}
```

## Rate Limits

- **Free Tier**: Check The News API documentation for current limits
- **Caching**: 5-minute cache reduces API calls
- **Error Handling**: Graceful fallback to sample news if limits exceeded

## Testing

### Test the Integration

1. **Start the backend server**:
   ```bash
   cd backend
   npm start
   ```

2. **Test the news endpoint**:
   ```bash
   curl http://localhost:3001/api/news
   ```

3. **Check the response**: You should see an array of financial news articles

### Troubleshooting

**No news loading**:
- Check if `THE_NEWS_API_KEY` is set in your `.env` file
- Verify your API key is valid on The News API dashboard
- Check the backend console for error messages

**Only sample news showing**:
- This indicates the API key is missing or invalid
- Check your internet connection
- Verify The News API service status

**CORS errors**:
- The News API is called from the backend, so CORS shouldn't be an issue
- If you see CORS errors, they're likely from other services

## Migration from Previous News Sources

The application previously used multiple news APIs (Yahoo Finance, Alpha Vantage, Finnhub, etc.). The News API integration:

✅ **Simplifies configuration**: Only one API key needed
✅ **Improves reliability**: Single, dedicated news service
✅ **Better performance**: Optimized for speed
✅ **More content**: Over 1 million articles weekly
✅ **Automatic filtering**: Smart financial news detection

## Support

If you encounter issues:

1. **Check The News API documentation**: https://www.thenewsapi.com/documentation
2. **Verify your API key**: Log into your The News API dashboard
3. **Check backend logs**: Look for error messages in the console
4. **Test with sample data**: The app will show sample news if the API fails

## Next Steps

1. **Get your API key** from The News API
2. **Update your `.env` file** with the key
3. **Restart your backend server**
4. **Test the news feed** in the application
5. **Monitor usage** on The News API dashboard

The News API integration provides a robust, reliable news source for your SIRFA trading application!