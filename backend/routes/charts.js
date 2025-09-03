const express = require('express');
const router = express.Router();
const alphaVantageService = require('../services/alphaVantageService');

// Get real-time quote for a symbol
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const quote = await alphaVantageService.getQuote(symbol);
    res.json({
      success: true,
      data: quote
    });
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch quote data'
    });
  }
});

// Get intraday data for charts
router.get('/intraday/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '5min' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    // Validate interval
    const validIntervals = ['1min', '5min', '15min', '30min', '60min'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({ 
        error: `Invalid interval. Must be one of: ${validIntervals.join(', ')}` 
      });
    }

    const data = await alphaVantageService.getIntradayData(symbol, interval);
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching intraday data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch intraday data'
    });
  }
});

// Get daily historical data
router.get('/daily/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { outputsize = 'compact' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    // Validate outputsize
    const validOutputSizes = ['compact', 'full'];
    if (!validOutputSizes.includes(outputsize)) {
      return res.status(400).json({ 
        error: `Invalid outputsize. Must be one of: ${validOutputSizes.join(', ')}` 
      });
    }

    const data = await alphaVantageService.getDailyData(symbol, outputsize);
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching daily data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch daily data'
    });
  }
});

// Get company overview
router.get('/overview/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const overview = await alphaVantageService.getCompanyOverview(symbol);
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Error fetching company overview:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch company overview'
    });
  }
});

// Get market news
router.get('/news', async (req, res) => {
  try {
    const { topics = 'financial_markets', limit = 50 } = req.query;
    
    const news = await alphaVantageService.getMarketNews(topics, parseInt(limit));
    res.json({
      success: true,
      data: news
    });
  } catch (error) {
    console.error('Error fetching market news:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch market news'
    });
  }
});

// Get multiple quotes at once
router.post('/quotes', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Symbols array is required' });
    }

    if (symbols.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 symbols allowed per request' });
    }

    const quotes = await Promise.allSettled(
      symbols.map(symbol => alphaVantageService.getQuote(symbol))
    );

    const results = quotes.map((result, index) => ({
      symbol: symbols[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching multiple quotes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch quotes'
    });
  }
});

// Get chart data with different time ranges
router.get('/chart/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = '1D', interval = '5min' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    let data;
    
    switch (range.toUpperCase()) {
      case '1D':
      case 'INTRADAY':
        data = await alphaVantageService.getIntradayData(symbol, interval);
        // Limit to last trading day for 1D view
        if (data.data && data.data.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          data.data = data.data.filter(item => item.timestamp.startsWith(today));
        }
        break;
      case '1W':
      case '1M':
      case '3M':
      case '6M':
      case '1Y':
      case 'DAILY':
      default:
        data = await alphaVantageService.getDailyData(symbol, 'compact');
        
        // Filter data based on range
        if (data.data && data.data.length > 0) {
          const now = new Date();
          let cutoffDate;
          
          switch (range.toUpperCase()) {
            case '1W':
              cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case '1M':
              cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case '3M':
              cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              break;
            case '6M':
              cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
              break;
            case '1Y':
              cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
              break;
            default:
              cutoffDate = null;
          }
          
          if (cutoffDate) {
            data.data = data.data.filter(item => new Date(item.date) >= cutoffDate);
          }
        }
        break;
    }

    res.json({
      success: true,
      data: data,
      range: range,
      interval: interval
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch chart data'
    });
  }
});

// Get API status and info
router.get('/status', (req, res) => {
  try {
    const info = alphaVantageService.getApiInfo();
    res.json({
      success: true,
      data: {
        ...info,
        timestamp: new Date().toISOString(),
        endpoints: {
          quote: '/api/charts/quote/:symbol',
          intraday: '/api/charts/intraday/:symbol?interval=5min',
          daily: '/api/charts/daily/:symbol?outputsize=compact',
          overview: '/api/charts/overview/:symbol',
          news: '/api/charts/news?topics=financial_markets&limit=50',
          quotes: 'POST /api/charts/quotes',
          chart: '/api/charts/chart/:symbol?range=1D&interval=5min'
        }
      }
    });
  } catch (error) {
    console.error('Error getting API status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get API status'
    });
  }
});

// Clear cache endpoint (for development/debugging)
router.delete('/cache', (req, res) => {
  try {
    alphaVantageService.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear cache'
    });
  }
});

module.exports = router;