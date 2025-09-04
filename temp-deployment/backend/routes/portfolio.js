const express = require('express');
const Alpaca = require('@alpacahq/alpaca-trade-api');
const router = express.Router();

// Initialize Alpaca client
const alpaca = new Alpaca({
  keyId: process.env.ALPACA_API_KEY,
  secretKey: process.env.ALPACA_SECRET_KEY,
  baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
  dataBaseUrl: process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets'
});

// Get portfolio overview
router.get('/overview', async (req, res) => {
  try {
    // Get account information
    const account = await alpaca.getAccount();
    
    // Get portfolio history for day change calculation
    const portfolioHistory = await alpaca.getPortfolioHistory({
      period: '1D',
      timeframe: '1Min'
    });
    
    // Calculate day change
    const currentValue = parseFloat(account.portfolio_value);
    const previousValue = portfolioHistory.equity && portfolioHistory.equity.length > 0 
      ? portfolioHistory.equity[0] 
      : currentValue;
    
    const dayChange = currentValue - previousValue;
    const dayChangePercent = previousValue !== 0 ? (dayChange / previousValue) * 100 : 0;
    
    const portfolioData = {
      totalValue: currentValue,
      dayChange: dayChange,
      dayChangePercent: dayChangePercent,
      buyingPower: parseFloat(account.buying_power),
      equity: parseFloat(account.equity),
      longMarketValue: parseFloat(account.long_market_value || 0),
      shortMarketValue: parseFloat(account.short_market_value || 0),
      accountStatus: account.status,
      tradingBlocked: account.trading_blocked,
      transfersBlocked: account.transfers_blocked
    };
    
    res.json(portfolioData);
  } catch (error) {
    console.error('Error fetching portfolio overview:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio data' });
  }
});

// Get current positions
router.get('/positions', async (req, res) => {
  try {
    const positions = await alpaca.getPositions();
    
    // Get pending orders to show as pending positions
    const allOrders = await alpaca.getOrders({
      limit: 50
    });
    
    // Filter for pending orders (new, pending_new, accepted, etc.)
    const orders = allOrders.filter(order => 
      ['new', 'pending_new', 'accepted', 'pending_replace'].includes(order.status)
    );
    
    // Get current market data for each position
    const positionsWithData = await Promise.all(
      positions.map(async (position) => {
        try {
          // Get latest quote
          const quote = await alpaca.getLatestTrade(position.symbol);
          const currentPrice = quote.Price || parseFloat(position.market_value) / parseFloat(position.qty);
          
          // Calculate unrealized P&L
          const unrealizedPL = parseFloat(position.unrealized_pl);
          const unrealizedPLPercent = parseFloat(position.unrealized_plpc) * 100;
          
          return {
            symbol: position.symbol,
            name: position.symbol, // You might want to get company name from another API
            shares: parseFloat(position.qty),
            currentPrice: currentPrice,
            value: parseFloat(position.market_value),
            change: unrealizedPL,
            changePercent: unrealizedPLPercent,
            avgCost: parseFloat(position.avg_cost),
            side: position.side, // 'long' or 'short'
            status: 'filled'
          };
        } catch (error) {
          console.error(`Error fetching data for ${position.symbol}:`, error);
          return {
            symbol: position.symbol,
            name: position.symbol,
            shares: parseFloat(position.qty),
            currentPrice: parseFloat(position.market_value) / parseFloat(position.qty),
            value: parseFloat(position.market_value),
            change: parseFloat(position.unrealized_pl),
            changePercent: parseFloat(position.unrealized_plpc) * 100,
            avgCost: parseFloat(position.avg_cost),
            side: position.side
          };
        }
      })
    );
    
    // Add pending orders as pending positions
    const pendingPositions = await Promise.all(
      orders.map(async (order) => {
        try {
          // Get current price for the symbol
          const quote = await alpaca.getLatestTrade(order.symbol);
          const currentPrice = quote.Price || 100; // fallback price
          const estimatedValue = parseFloat(order.qty) * currentPrice;
          
          return {
            symbol: order.symbol,
            name: order.symbol,
            shares: parseFloat(order.qty),
            currentPrice: currentPrice,
            value: estimatedValue,
            change: 0,
            changePercent: 0,
            avgCost: order.limit_price ? parseFloat(order.limit_price) : currentPrice,
            side: order.side, // 'buy' or 'sell'
            status: 'pending',
            orderType: order.order_type,
            submittedAt: order.submitted_at
          };
        } catch (error) {
          console.error(`Error fetching data for pending order ${order.symbol}:`, error);
          return {
            symbol: order.symbol,
            name: order.symbol,
            shares: parseFloat(order.qty),
            currentPrice: 0,
            value: 0,
            change: 0,
            changePercent: 0,
            avgCost: 0,
            side: order.side,
            status: 'pending',
            orderType: order.order_type,
            submittedAt: order.submitted_at
          };
        }
      })
    );
    
    // Combine filled positions and pending positions
    const allPositions = [...positionsWithData, ...pendingPositions];
    
    res.json(allPositions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Failed to fetch positions data' });
  }
});

// Get portfolio allocation by sector (simplified version)
router.get('/allocation', async (req, res) => {
  try {
    const positions = await alpaca.getPositions();
    
    // Simple sector mapping (in a real app, you'd use a more comprehensive mapping)
    const sectorMapping = {
      'AAPL': 'Technology',
      'MSFT': 'Technology', 
      'GOOGL': 'Technology',
      'AMZN': 'Technology',
      'TSLA': 'Automotive',
      'NVDA': 'Technology',
      'META': 'Technology',
      'JPM': 'Finance',
      'JNJ': 'Healthcare',
      'V': 'Finance'
    };
    
    const sectorAllocation = {};
    let totalValue = 0;
    
    positions.forEach(position => {
      const value = parseFloat(position.market_value);
      const sector = sectorMapping[position.symbol] || 'Other';
      
      if (!sectorAllocation[sector]) {
        sectorAllocation[sector] = { value: 0, percentage: 0 };
      }
      
      sectorAllocation[sector].value += value;
      totalValue += value;
    });
    
    // Calculate percentages
    const allocation = Object.entries(sectorAllocation).map(([sector, data]) => ({
      sector,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0
    }));
    
    res.json(allocation);
  } catch (error) {
    console.error('Error fetching allocation:', error);
    res.status(500).json({ error: 'Failed to fetch allocation data' });
  }
});

// Get portfolio performance history
router.get('/history', async (req, res) => {
  try {
    const { period = '1M', timeframe = '1D' } = req.query;
    
    const portfolioHistory = await alpaca.getPortfolioHistory({
      period,
      timeframe
    });
    
    const historyData = {
      timestamps: portfolioHistory.timestamp || [],
      equity: portfolioHistory.equity || [],
      profit_loss: portfolioHistory.profit_loss || [],
      profit_loss_pct: portfolioHistory.profit_loss_pct || []
    };
    
    res.json(historyData);
  } catch (error) {
    console.error('Error fetching portfolio history:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio history' });
  }
});

module.exports = router;