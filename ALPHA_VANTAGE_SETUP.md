# Alpha Vantage API Setup Guide

This guide will help you set up Alpha Vantage API integration for real-time and historical market data in the SIRFA Agent Finance platform.

## What is Alpha Vantage?

Alpha Vantage provides real-time and historical financial market data through a simple REST API. It offers:
- Real-time stock quotes
- Intraday and daily historical data
- Technical indicators
- Company fundamentals
- Market news and sentiment
- Forex and cryptocurrency data

## Step 1: Create Alpha Vantage Account

1. Visit [Alpha Vantage](https://www.alphavantage.co/)
2. Click "Get Free API Key"
3. Fill out the registration form:
   - First Name
   - Last Name
   - Email Address
   - Organization (can be "Personal" or your company)
   - Intended API usage description
4. Click "GET FREE API KEY"
5. Check your email for the API key

## Step 2: Retrieve Your API Key

1. After registration, you'll receive an email with your API key
2. You can also find your API key in your Alpha Vantage dashboard
3. The API key format looks like: `ABCD1234EFGH5678`

## Step 3: Configure Environment Variables

1. Open the `backend/.env` file in your project
2. Update the Alpha Vantage API key:

```env
# Alpha Vantage Configuration
ALPHA_VANTAGE_API_KEY=your_actual_api_key_here
```

**Replace `your_actual_api_key_here` with your actual Alpha Vantage API key.**

## Step 4: Restart the Backend Server

1. Stop the current backend server (Ctrl+C)
2. Restart it:
```bash
cd backend
npm start
```

## Step 5: Test the Integration

### Test Real-time Quote
```bash
curl "http://localhost:3001/api/charts/quote/AAPL"
```

### Test Historical Data
```bash
curl "http://localhost:3001/api/charts/daily/AAPL"
```

### Test API Status
```bash
curl "http://localhost:3001/api/charts/status"
```

## Available API Endpoints

Once configured, the following endpoints will be available:

### Real-time Data
- `GET /api/charts/quote/:symbol` - Real-time stock quote
- `GET /api/charts/intraday/:symbol` - Intraday price data

### Historical Data
- `GET /api/charts/daily/:symbol` - Daily historical data
- `GET /api/charts/chart/:symbol/:range` - Chart data for specific time ranges

### Company Information
- `GET /api/charts/overview/:symbol` - Company overview and fundamentals

### Market News
- `GET /api/charts/news` - Latest market news
- `GET /api/charts/news/:symbol` - Symbol-specific news

### Utility
- `GET /api/charts/status` - API status and rate limits
- `POST /api/charts/cache/clear` - Clear cached data

## API Rate Limits

### Free Tier Limits
- **5 API requests per minute**
- **500 API requests per day**
- Standard support

### Premium Tiers
- **Basic ($49.99/month)**: 75 requests/minute, 75,000/month
- **Professional ($149.99/month)**: 150 requests/minute, 150,000/month
- **Enterprise ($599.99/month)**: 600 requests/minute, 600,000/month

## Supported Symbols

Alpha Vantage supports:
- **US Stocks**: AAPL, GOOGL, MSFT, TSLA, etc.
- **International Stocks**: Add exchange suffix (e.g., `TSLA.LON`)
- **ETFs**: SPY, QQQ, VTI, etc.
- **Mutual Funds**: VTSAX, FXAIX, etc.
- **Forex**: EUR/USD, GBP/USD, etc.
- **Cryptocurrencies**: BTC, ETH, etc.

## Chart Features Available

With Alpha Vantage integration, you'll have access to:

### Stock Charts
- Real-time price updates
- Candlestick charts
- Line and area charts
- Multiple timeframes (1min, 5min, 15min, 30min, 60min, daily)
- Technical indicators

### Portfolio Charts
- Performance tracking
- Asset allocation visualization
- Historical performance comparison

### Market Analysis
- Sector performance
- Market overview charts
- News sentiment analysis

## Troubleshooting

### Common Issues

1. **"Invalid API key" Error**
   - Verify your API key is correct in the `.env` file
   - Ensure there are no extra spaces or characters
   - Check that you're using the key from the correct Alpha Vantage account

2. **"API call frequency exceeded" Error**
   - You've hit the rate limit (5 requests/minute for free tier)
   - Wait a minute before making more requests
   - Consider upgrading to a premium plan for higher limits

3. **"No data available" Error**
   - Check if the symbol is valid and supported
   - Verify the market is open (for real-time data)
   - Some symbols may not have complete historical data

4. **Charts Not Loading**
   - Check browser console for JavaScript errors
   - Verify the backend server is running
   - Ensure the API key is properly configured

### Debug Steps

1. **Check API Status**:
   ```bash
   curl "http://localhost:3001/api/charts/status"
   ```

2. **Test Direct Alpha Vantage API**:
   ```bash
   curl "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=YOUR_API_KEY"
   ```

3. **Check Backend Logs**:
   - Look for error messages in the terminal where you started the backend
   - Check for network connectivity issues

## Security Best Practices

1. **Never commit your API key to version control**
2. **Use environment variables for API keys**
3. **Regularly rotate your API keys**
4. **Monitor your API usage in the Alpha Vantage dashboard**
5. **Set up usage alerts to avoid unexpected charges**

## Getting Help

- **Alpha Vantage Documentation**: https://www.alphavantage.co/documentation/
- **Alpha Vantage Support**: https://www.alphavantage.co/support/
- **Community Forum**: Check Alpha Vantage's community resources

## Next Steps

After setting up Alpha Vantage:

1. **Explore the Charts page** in the frontend application
2. **Test different symbols** and timeframes
3. **Monitor your API usage** to stay within limits
4. **Consider upgrading** to a premium plan if you need higher limits
5. **Integrate with your trading strategy** using the real-time data

---

**Note**: The demo API key (`demo`) provides limited sample data. For full functionality and real-time data, you must use your own Alpha Vantage API key.