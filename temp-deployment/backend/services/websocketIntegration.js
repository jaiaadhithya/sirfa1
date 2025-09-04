// SIRFA Agent Finance - WebSocket Integration Service
// Connects WebSocket server with trading, portfolio, and news services

const EventEmitter = require('events');
const config = require('../config');

class WebSocketIntegration extends EventEmitter {
  constructor(wsServer) {
    super();
    this.wsServer = wsServer;
    this.isInitialized = false;
    this.updateIntervals = new Map();
    this.lastPortfolioData = null;
    this.lastMarketData = null;
  }

  /**
   * Initialize WebSocket integration
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing WebSocket integration...');

    // Set up periodic updates
    this.setupPortfolioUpdates();
    this.setupMarketDataUpdates();
    this.setupNewsUpdates();

    // Set up event listeners for real-time updates
    this.setupEventListeners();

    this.isInitialized = true;
    console.log('WebSocket integration initialized');
  }

  /**
   * Set up periodic portfolio updates
   */
  setupPortfolioUpdates() {
    const interval = setInterval(async () => {
      try {
        const portfolioData = await this.fetchPortfolioData();
        if (portfolioData && this.hasPortfolioChanged(portfolioData)) {
          this.lastPortfolioData = portfolioData;
          this.wsServer.broadcastPortfolioUpdate(portfolioData);
        }
      } catch (error) {
        console.error('Error fetching portfolio data for WebSocket:', error);
      }
    }, config.portfolio.refreshInterval);

    this.updateIntervals.set('portfolio', interval);
  }

  /**
   * Set up periodic market data updates
   */
  setupMarketDataUpdates() {
    const interval = setInterval(async () => {
      try {
        const marketData = await this.fetchMarketData();
        if (marketData && this.hasMarketDataChanged(marketData)) {
          this.lastMarketData = marketData;
          this.wsServer.broadcastMarketData(marketData);
        }
      } catch (error) {
        console.error('Error fetching market data for WebSocket:', error);
      }
    }, 30000); // 30 seconds for market data

    this.updateIntervals.set('market', interval);
  }

  /**
   * Set up periodic news updates
   */
  setupNewsUpdates() {
    const interval = setInterval(async () => {
      try {
        const newsData = await this.fetchLatestNews();
        if (newsData && newsData.length > 0) {
          this.wsServer.broadcastNewsUpdate(newsData);
        }
      } catch (error) {
        console.error('Error fetching news data for WebSocket:', error);
      }
    }, config.news.refreshInterval);

    this.updateIntervals.set('news', interval);
  }

  /**
   * Set up event listeners for real-time updates
   */
  setupEventListeners() {
    // Listen for trading decisions from AI agent
    this.on('trading_decision', (decision) => {
      this.wsServer.broadcastTradingDecision({
        ...decision,
        timestamp: new Date().toISOString()
      });
    });

    // Listen for portfolio changes
    this.on('portfolio_change', (portfolioData) => {
      this.lastPortfolioData = portfolioData;
      this.wsServer.broadcastPortfolioUpdate(portfolioData);
    });

    // Listen for market alerts
    this.on('market_alert', (alert) => {
      this.wsServer.broadcastAlert({
        type: 'market_alert',
        ...alert,
        timestamp: new Date().toISOString()
      });
    });

    // Listen for system alerts
    this.on('system_alert', (alert) => {
      this.wsServer.broadcastAlert({
        type: 'system_alert',
        ...alert,
        timestamp: new Date().toISOString()
      });
    });

    // Listen for news alerts
    this.on('news_alert', (newsItem) => {
      this.wsServer.broadcastAlert({
        type: 'news_alert',
        title: newsItem.title,
        summary: newsItem.summary,
        sentiment: newsItem.sentiment,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Fetch current portfolio data
   */
  async fetchPortfolioData() {
    try {
      // Use the existing portfolio API endpoint
      const axios = require('axios');
      const response = await axios.get('http://localhost:3001/api/portfolio/overview');
      return response.data;
    } catch (error) {
      console.error('Error in fetchPortfolioData:', error);
      return null;
    }
  }

  /**
   * Fetch current market data
   */
  async fetchMarketData() {
    try {
      // Use alphaVantageService for market data
      const alphaVantageService = require('./alphaVantageService');
      // Return mock market data for now
      return {
        timestamp: new Date().toISOString(),
        indices: {
          'S&P 500': { value: 4500 + Math.random() * 100, change: (Math.random() - 0.5) * 20 },
          'NASDAQ': { value: 14000 + Math.random() * 200, change: (Math.random() - 0.5) * 30 },
          'DOW': { value: 35000 + Math.random() * 300, change: (Math.random() - 0.5) * 40 }
        }
      };
    } catch (error) {
      console.error('Error in fetchMarketData:', error);
      return null;
    }
  }

  /**
   * Fetch latest news
   */
  async fetchLatestNews() {
    try {
      // Try to fetch news from the news route API instead of a service
      const axios = require('axios');
      const response = await axios.get('http://localhost:3001/api/news');
      return response.data.slice(0, 5); // Get 5 latest news items
    } catch (error) {
      console.error('Error in fetchLatestNews:', error);
      return [];
    }
  }

  /**
   * Check if portfolio data has changed significantly
   */
  hasPortfolioChanged(newData) {
    if (!this.lastPortfolioData) {
      return true;
    }

    // Compare key metrics
    const oldValue = this.lastPortfolioData.totalValue || 0;
    const newValue = newData.totalValue || 0;
    const changePercentage = Math.abs((newValue - oldValue) / oldValue) * 100;

    // Broadcast if change is > 0.1% or if positions changed
    return changePercentage > 0.1 || 
           this.lastPortfolioData.positions?.length !== newData.positions?.length;
  }

  /**
   * Check if market data has changed significantly
   */
  hasMarketDataChanged(newData) {
    if (!this.lastMarketData) {
      return true;
    }

    // Compare key market indicators
    const oldSP500 = this.lastMarketData.sp500 || 0;
    const newSP500 = newData.sp500 || 0;
    const changePercentage = Math.abs((newSP500 - oldSP500) / oldSP500) * 100;

    // Broadcast if change is > 0.05%
    return changePercentage > 0.05;
  }

  /**
   * Broadcast trading decision
   */
  broadcastTradingDecision(decision) {
    this.emit('trading_decision', decision);
  }

  /**
   * Broadcast portfolio change
   */
  broadcastPortfolioChange(portfolioData) {
    this.emit('portfolio_change', portfolioData);
  }

  /**
   * Broadcast market alert
   */
  broadcastMarketAlert(alert) {
    this.emit('market_alert', alert);
  }

  /**
   * Broadcast system alert
   */
  broadcastSystemAlert(alert) {
    this.emit('system_alert', alert);
  }

  /**
   * Broadcast news alert
   */
  broadcastNewsAlert(newsItem) {
    this.emit('news_alert', newsItem);
  }

  /**
   * Handle trading action from WebSocket client
   */
  async handleTradingAction(clientId, actionData) {
    try {
      console.log(`Processing trading action from client ${clientId}:`, actionData);

      // Validate action data
      if (!this.validateTradingAction(actionData)) {
        throw new Error('Invalid trading action data');
      }

      // Process the trading action
      const result = await this.processTradingAction(actionData);

      // Broadcast the result
      this.wsServer.sendToClient(clientId, {
        type: 'trading_action_result',
        data: {
          actionId: actionData.actionId,
          status: 'completed',
          result: result,
          timestamp: new Date().toISOString()
        }
      });

      // Broadcast portfolio update if trade was executed
      if (result.executed) {
        const updatedPortfolio = await this.fetchPortfolioData();
        if (updatedPortfolio) {
          this.broadcastPortfolioChange(updatedPortfolio);
        }
      }

      return result;
    } catch (error) {
      console.error('Error handling trading action:', error);
      
      // Send error to client
      this.wsServer.sendToClient(clientId, {
        type: 'trading_action_error',
        data: {
          actionId: actionData.actionId,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      });

      throw error;
    }
  }

  /**
   * Validate trading action data
   */
  validateTradingAction(actionData) {
    const required = ['symbol', 'action', 'quantity'];
    return required.every(field => actionData.hasOwnProperty(field));
  }

  /**
   * Process trading action
   */
  async processTradingAction(actionData) {
    try {
      const tradingService = require('./trading');
      return await tradingService.executeTrade(actionData);
    } catch (error) {
      console.error('Error processing trading action:', error);
      return {
        executed: false,
        error: error.message
      };
    }
  }

  /**
   * Get integration statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      activeIntervals: this.updateIntervals.size,
      lastPortfolioUpdate: this.lastPortfolioData ? new Date() : null,
      lastMarketUpdate: this.lastMarketData ? new Date() : null,
      eventListeners: this.eventNames().length
    };
  }

  /**
   * Shutdown integration
   */
  async shutdown() {
    console.log('Shutting down WebSocket integration...');

    // Clear all intervals
    this.updateIntervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`Cleared ${name} update interval`);
    });
    this.updateIntervals.clear();

    // Remove all event listeners
    this.removeAllListeners();

    this.isInitialized = false;
    console.log('WebSocket integration shutdown complete');
  }
}

module.exports = WebSocketIntegration;