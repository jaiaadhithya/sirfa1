# Alpaca Paper Trading Setup Guide

## Overview
This guide will help you set up Alpaca paper trading for the SIRFA Agent Finance platform. Paper trading allows you to test trading strategies with virtual money before using real funds.

## Step 1: Create Alpaca Account

1. Go to [Alpaca Markets](https://alpaca.markets/)
2. Click "Get Started" and create a free account
3. Complete the account verification process
4. Once verified, you'll have access to both paper and live trading

## Step 2: Get API Credentials

1. Log into your Alpaca account
2. Navigate to the **API** section in your dashboard
3. Generate new API keys for **Paper Trading**
   - Click "Generate New Key"
   - Give it a name like "SIRFA Paper Trading"
   - **Important**: Select "Paper Trading" (not Live Trading)
   - Copy both the **API Key** and **Secret Key**

## Step 3: Configure Environment Variables

1. Open the `.env` file in the `backend` folder
2. Replace the placeholder values with your actual Alpaca credentials:

```env
# Replace these with your actual Alpaca API credentials
ALPACA_API_KEY=your_actual_alpaca_api_key_here
ALPACA_SECRET_KEY=your_actual_alpaca_secret_key_here
```

## Step 4: Verify Setup

1. Save the `.env` file
2. Restart the backend server (it should already be running)
3. Test the connection by visiting: `http://localhost:3001/api/trading/account`
4. You should see your paper trading account information

## Important Notes

- **Paper Trading**: The current setup uses Alpaca's paper trading environment (`https://paper-api.alpaca.markets`)
- **Virtual Money**: You start with $100,000 in virtual money for testing
- **Real-time Data**: You get real-time market data for testing
- **No Risk**: Paper trading involves no real money

## Available API Endpoints

Once configured, you can use these endpoints:

- `GET /api/trading/account` - Get account information
- `POST /api/trading/order` - Place a new order
- `GET /api/trading/orders` - Get all orders
- `GET /api/trading/quote/:symbol` - Get real-time quote
- `GET /api/trading/bars/:symbol` - Get historical price data

## Troubleshooting

### Invalid API Credentials
- Double-check your API key and secret
- Ensure you're using Paper Trading credentials (not Live Trading)
- Make sure there are no extra spaces in the `.env` file

### Connection Issues
- Verify your internet connection
- Check if Alpaca's API is operational at [status.alpaca.markets](https://status.alpaca.markets/)

### Account Access
- Ensure your Alpaca account is fully verified
- Check that paper trading is enabled for your account

## Next Steps

Once Alpaca is configured:
1. The frontend will show real portfolio data
2. You can place actual paper trades through the UI
3. The AI agents can make trading decisions with real market data
4. All trades are executed in the paper trading environment

## Security Notes

- Never commit your actual API keys to version control
- Keep your `.env` file secure and private
- Use different API keys for development and production
- Regularly rotate your API keys for security

---

**Ready to start trading?** Once you've completed these steps, your SIRFA platform will be connected to Alpaca's paper trading environment!