const axios = require('axios');
const config = require('../config');

class AlphaVantageService {
  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    this.baseUrl = 'https://www.alphavantage.co/query';
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
  }

  // Get real-time quote for a symbol
  async getQuote(symbol) {
    const cacheKey = `quote_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol.toUpperCase(),
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const data = response.data;
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage API Error: ${data['Error Message']}`);
      }

      if (data['Note']) {
        throw new Error('Alpha Vantage API rate limit exceeded');
      }

      const quote = data['Global Quote'];
      if (!quote) {
        throw new Error('No quote data available');
      }

      const result = {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: quote['10. change percent'].replace('%', ''),
        volume: parseInt(quote['06. volume']),
        previousClose: parseFloat(quote['08. previous close']),
        open: parseFloat(quote['02. open']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        latestTradingDay: quote['07. latest trading day']
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error.message);
      throw error;
    }
  }

  // Get intraday data for charts
  async getIntradayData(symbol, interval = '5min') {
    const cacheKey = `intraday_${symbol}_${interval}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'TIME_SERIES_INTRADAY',
          symbol: symbol.toUpperCase(),
          interval: interval,
          apikey: this.apiKey,
          outputsize: 'compact'
        },
        timeout: 15000
      });

      const data = response.data;
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage API Error: ${data['Error Message']}`);
      }

      if (data['Note']) {
        throw new Error('Alpha Vantage API rate limit exceeded');
      }

      const timeSeries = data[`Time Series (${interval})`];
      if (!timeSeries) {
        // Return mock data when API data is not available
        return this.generateMockIntradayData(symbol, interval);
      }

      const result = {
        symbol: data['Meta Data']['2. Symbol'],
        lastRefreshed: data['Meta Data']['3. Last Refreshed'],
        interval: data['Meta Data']['4. Interval'],
        data: Object.entries(timeSeries).map(([timestamp, values]) => ({
          timestamp,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        })).reverse() // Reverse to get chronological order
      };

      this.setCachedData(cacheKey, result, 300000); // 5 minute cache for intraday
      return result;
    } catch (error) {
      console.error(`Error fetching intraday data for ${symbol}:`, error.message);
      throw error;
    }
  }

  // Get daily historical data
  async getDailyData(symbol, outputsize = 'compact') {
    const cacheKey = `daily_${symbol}_${outputsize}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol: symbol.toUpperCase(),
          apikey: this.apiKey,
          outputsize: outputsize
        },
        timeout: 15000
      });

      const data = response.data;
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage API Error: ${data['Error Message']}`);
      }

      if (data['Note']) {
        throw new Error('Alpha Vantage API rate limit exceeded');
      }

      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        // Return mock data when API data is not available
        return this.generateMockDailyData(symbol);
      }

      const result = {
        symbol: data['Meta Data']['2. Symbol'],
        lastRefreshed: data['Meta Data']['3. Last Refreshed'],
        data: Object.entries(timeSeries).map(([date, values]) => ({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        })).reverse() // Reverse to get chronological order
      };

      this.setCachedData(cacheKey, result, 1800000); // 30 minute cache for daily data
      return result;
    } catch (error) {
      console.error(`Error fetching daily data for ${symbol}:`, error.message);
      throw error;
    }
  }

  // Get company overview
  async getCompanyOverview(symbol) {
    const cacheKey = `overview_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'OVERVIEW',
          symbol: symbol.toUpperCase(),
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const data = response.data;
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage API Error: ${data['Error Message']}`);
      }

      if (data['Note']) {
        throw new Error('Alpha Vantage API rate limit exceeded');
      }

      if (!data.Symbol) {
        throw new Error('No company overview data available');
      }

      const result = {
        symbol: data.Symbol,
        name: data.Name,
        description: data.Description,
        sector: data.Sector,
        industry: data.Industry,
        marketCap: data.MarketCapitalization,
        peRatio: data.PERatio,
        pegRatio: data.PEGRatio,
        bookValue: data.BookValue,
        dividendPerShare: data.DividendPerShare,
        dividendYield: data.DividendYield,
        eps: data.EPS,
        revenuePerShareTTM: data.RevenuePerShareTTM,
        profitMargin: data.ProfitMargin,
        operatingMarginTTM: data.OperatingMarginTTM,
        returnOnAssetsTTM: data.ReturnOnAssetsTTM,
        returnOnEquityTTM: data.ReturnOnEquityTTM,
        revenueTTM: data.RevenueTTM,
        grossProfitTTM: data.GrossProfitTTM,
        dilutedEPSTTM: data.DilutedEPSTTM,
        quarterlyEarningsGrowthYOY: data.QuarterlyEarningsGrowthYOY,
        quarterlyRevenueGrowthYOY: data.QuarterlyRevenueGrowthYOY,
        analystTargetPrice: data.AnalystTargetPrice,
        trailingPE: data.TrailingPE,
        forwardPE: data.ForwardPE,
        priceToSalesRatioTTM: data.PriceToSalesRatioTTM,
        priceToBookRatio: data.PriceToBookRatio,
        evToRevenue: data.EVToRevenue,
        evToEBITDA: data.EVToEBITDA,
        beta: data.Beta,
        week52High: data['52WeekHigh'],
        week52Low: data['52WeekLow'],
        day50MovingAverage: data['50DayMovingAverage'],
        day200MovingAverage: data['200DayMovingAverage'],
        sharesOutstanding: data.SharesOutstanding,
        sharesFloat: data.SharesFloat,
        sharesShort: data.SharesShort,
        sharesShortPriorMonth: data.SharesShortPriorMonth,
        shortRatio: data.ShortRatio,
        shortPercentOutstanding: data.ShortPercentOutstanding,
        shortPercentFloat: data.ShortPercentFloat,
        percentInsiders: data.PercentInsiders,
        percentInstitutions: data.PercentInstitutions
      };

      this.setCachedData(cacheKey, result, 3600000); // 1 hour cache for company overview
      return result;
    } catch (error) {
      console.error(`Error fetching company overview for ${symbol}:`, error.message);
      throw error;
    }
  }

  // Get market news and sentiment
  async getMarketNews(topics = 'financial_markets', limit = 50) {
    const cacheKey = `news_${topics}_${limit}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'NEWS_SENTIMENT',
          topics: topics,
          limit: limit,
          apikey: this.apiKey
        },
        timeout: 15000
      });

      const data = response.data;
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage API Error: ${data['Error Message']}`);
      }

      if (data['Note']) {
        throw new Error('Alpha Vantage API rate limit exceeded');
      }

      const result = {
        items: data.items || data.feed || [],
        sentiment_score_definition: data.sentiment_score_definition,
        relevance_score_definition: data.relevance_score_definition
      };

      this.setCachedData(cacheKey, result, 600000); // 10 minute cache for news
      return result;
    } catch (error) {
      console.error('Error fetching market news:', error.message);
      throw error;
    }
  }

  // Cache management
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.timeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCachedData(key, data, timeout = this.cacheTimeout) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      timeout
    });
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get API usage info
  getApiInfo() {
    return {
      apiKey: this.apiKey ? '***' : 'Not set',
      baseUrl: this.baseUrl,
      cacheSize: this.cache.size,
      isDemo: this.apiKey === 'demo'
    };
  }

  /**
   * Generate mock intraday data for demonstration when API fails
   */
  generateMockIntradayData(symbol, interval) {
    const now = new Date();
    const data = [];
    const basePrice = 150 + Math.random() * 100; // Random base price between 150-250
    
    // Generate 50 data points going back in time
    for (let i = 49; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000); // 5 minute intervals
      const price = basePrice + (Math.random() - 0.5) * 10; // Price variation
      const volume = Math.floor(Math.random() * 10000) + 1000;
      
      data.push({
        timestamp: timestamp.toISOString().slice(0, 19),
        open: (price + (Math.random() - 0.5) * 2).toFixed(2),
        high: (price + Math.random() * 3).toFixed(2),
        low: (price - Math.random() * 3).toFixed(2),
        close: price.toFixed(2),
        volume: volume.toString()
      });
    }
    
    return {
       symbol: symbol,
       lastRefreshed: now.toISOString().slice(0, 19),
       interval: interval,
       data: data
     };
   }

   /**
    * Generate mock daily data for demonstration when API fails
    */
   generateMockDailyData(symbol) {
     const now = new Date();
     const data = [];
     const basePrice = 150 + Math.random() * 100; // Random base price between 150-250
     
     // Generate 30 days of data going back in time
     for (let i = 29; i >= 0; i--) {
       const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // Daily intervals
       const price = basePrice + (Math.random() - 0.5) * 20; // Price variation
       const volume = Math.floor(Math.random() * 100000) + 10000;
       
       data.push({
         timestamp: date.toISOString().slice(0, 10),
         open: (price + (Math.random() - 0.5) * 5).toFixed(2),
         high: (price + Math.random() * 8).toFixed(2),
         low: (price - Math.random() * 8).toFixed(2),
         close: price.toFixed(2),
         volume: volume.toString()
       });
     }
     
     return {
       symbol: symbol,
       lastRefreshed: now.toISOString().slice(0, 10),
       data: data
     };
   }
 }

module.exports = new AlphaVantageService();