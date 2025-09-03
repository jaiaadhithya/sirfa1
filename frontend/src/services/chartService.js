// Use relative URLs in development to leverage Vite proxy
const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

class ChartService {
  constructor() {
    this.baseUrl = import.meta.env.DEV ? '/charts' : `${API_BASE_URL}/charts`;
  }

  // Helper method for making API requests
  async makeRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data.data;
    } catch (error) {
      console.error(`Chart API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Get real-time quote for a symbol
  async getQuote(symbol) {
    if (!symbol) {
      throw new Error('Symbol is required');
    }
    return this.makeRequest(`/quote/${encodeURIComponent(symbol.toUpperCase())}`);
  }

  // Get intraday data for charts
  async getIntradayData(symbol, interval = '5min') {
    if (!symbol) {
      throw new Error('Symbol is required');
    }
    
    const validIntervals = ['1min', '5min', '15min', '30min', '60min'];
    if (!validIntervals.includes(interval)) {
      throw new Error(`Invalid interval. Must be one of: ${validIntervals.join(', ')}`);
    }

    return this.makeRequest(`/intraday/${encodeURIComponent(symbol.toUpperCase())}?interval=${interval}`);
  }

  // Get daily historical data
  async getDailyData(symbol, outputsize = 'compact') {
    if (!symbol) {
      throw new Error('Symbol is required');
    }
    
    const validOutputSizes = ['compact', 'full'];
    if (!validOutputSizes.includes(outputsize)) {
      throw new Error(`Invalid outputsize. Must be one of: ${validOutputSizes.join(', ')}`);
    }

    return this.makeRequest(`/daily/${encodeURIComponent(symbol.toUpperCase())}?outputsize=${outputsize}`);
  }

  // Get company overview
  async getCompanyOverview(symbol) {
    if (!symbol) {
      throw new Error('Symbol is required');
    }
    return this.makeRequest(`/overview/${encodeURIComponent(symbol.toUpperCase())}`);
  }

  // Get market news
  async getMarketNews(topics = 'financial_markets', limit = 50) {
    const params = new URLSearchParams({
      topics,
      limit: limit.toString()
    });
    return this.makeRequest(`/news?${params}`);
  }

  // Get multiple quotes at once
  async getMultipleQuotes(symbols) {
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw new Error('Symbols array is required');
    }

    if (symbols.length > 10) {
      throw new Error('Maximum 10 symbols allowed per request');
    }

    return this.makeRequest('/quotes', {
      method: 'POST',
      body: JSON.stringify({ symbols: symbols.map(s => s.toUpperCase()) })
    });
  }

  // Get chart data with different time ranges
  async getChartData(symbol, range = '1D', interval = '5min') {
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const validRanges = ['1D', '1W', '1M', '3M', '6M', '1Y', 'INTRADAY', 'DAILY'];
    if (!validRanges.includes(range.toUpperCase())) {
      throw new Error(`Invalid range. Must be one of: ${validRanges.join(', ')}`);
    }

    const params = new URLSearchParams({
      range,
      interval
    });

    return this.makeRequest(`/chart/${encodeURIComponent(symbol.toUpperCase())}?${params}`);
  }

  // Get API status and info
  async getApiStatus() {
    return this.makeRequest('/status');
  }

  // Clear cache (for development/debugging)
  async clearCache() {
    return this.makeRequest('/cache', { method: 'DELETE' });
  }

  // Batch request helper for multiple data points
  async getBatchData(requests) {
    if (!requests || !Array.isArray(requests)) {
      throw new Error('Requests array is required');
    }

    const results = await Promise.allSettled(
      requests.map(async (request) => {
        const { type, symbol, ...params } = request;
        
        switch (type) {
          case 'quote':
            return { type, symbol, data: await this.getQuote(symbol) };
          case 'intraday':
            return { type, symbol, data: await this.getIntradayData(symbol, params.interval) };
          case 'daily':
            return { type, symbol, data: await this.getDailyData(symbol, params.outputsize) };
          case 'overview':
            return { type, symbol, data: await this.getCompanyOverview(symbol) };
          case 'chart':
            return { type, symbol, data: await this.getChartData(symbol, params.range, params.interval) };
          default:
            throw new Error(`Unknown request type: ${type}`);
        }
      })
    );

    return results.map((result, index) => ({
      ...requests[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value.data : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  }

  // Get popular symbols for quick access
  getPopularSymbols() {
    return [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corporation' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.' },
      { symbol: 'TSLA', name: 'Tesla Inc.' },
      { symbol: 'META', name: 'Meta Platforms Inc.' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation' },
      { symbol: 'NFLX', name: 'Netflix Inc.' },
      { symbol: 'AMD', name: 'Advanced Micro Devices' },
      { symbol: 'INTC', name: 'Intel Corporation' }
    ];
  }

  // Validate symbol format
  isValidSymbol(symbol) {
    if (!symbol || typeof symbol !== 'string') {
      return false;
    }
    
    // Basic symbol validation (1-5 uppercase letters)
    const symbolRegex = /^[A-Z]{1,5}$/;
    return symbolRegex.test(symbol.toUpperCase());
  }

  // Format symbol for API calls
  formatSymbol(symbol) {
    if (!symbol) return '';
    return symbol.toString().toUpperCase().trim();
  }

  // Get time range options
  getTimeRangeOptions() {
    return [
      { value: '1D', label: '1 Day', interval: '5min' },
      { value: '1W', label: '1 Week', interval: '30min' },
      { value: '1M', label: '1 Month', interval: '1day' },
      { value: '3M', label: '3 Months', interval: '1day' },
      { value: '6M', label: '6 Months', interval: '1day' },
      { value: '1Y', label: '1 Year', interval: '1day' }
    ];
  }

  // Get interval options
  getIntervalOptions() {
    return [
      { value: '1min', label: '1 Minute' },
      { value: '5min', label: '5 Minutes' },
      { value: '15min', label: '15 Minutes' },
      { value: '30min', label: '30 Minutes' },
      { value: '60min', label: '1 Hour' }
    ];
  }

  // Check if market is open (basic check - doesn't account for holidays)
  isMarketOpen() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    // Market is closed on weekends
    if (day === 0 || day === 6) {
      return false;
    }
    
    // Market hours: 9:30 AM - 4:00 PM EST (converted to minutes)
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    
    return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
  }

  // Get market status
  getMarketStatus() {
    const isOpen = this.isMarketOpen();
    const now = new Date();
    
    return {
      isOpen,
      status: isOpen ? 'OPEN' : 'CLOSED',
      timestamp: now.toISOString(),
      nextOpen: isOpen ? null : this.getNextMarketOpen(),
      nextClose: isOpen ? this.getNextMarketClose() : null
    };
  }

  // Get next market open time (simplified)
  getNextMarketOpen() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 30, 0, 0);
    
    // Skip weekends
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    
    return tomorrow.toISOString();
  }

  // Get next market close time (simplified)
  getNextMarketClose() {
    const now = new Date();
    const today = new Date(now);
    today.setHours(16, 0, 0, 0);
    
    return today.toISOString();
  }
}

// Create and export a singleton instance
const chartService = new ChartService();
export default chartService;

// Also export the class for testing or custom instances
export { ChartService };
// Named export for compatibility
export { chartService };