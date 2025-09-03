const express = require('express');
const Alpaca = require('@alpacahq/alpaca-trade-api');
const performanceTracking = require('../services/performanceTracking');
const router = express.Router();

// Initialize Alpaca client
const alpaca = new Alpaca({
  keyId: process.env.ALPACA_API_KEY,
  secretKey: process.env.ALPACA_SECRET_KEY,
  baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
  dataBaseUrl: process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets'
});

// Get trading account status
router.get('/account', async (req, res) => {
  try {
    const account = await alpaca.getAccount();
    
    const accountInfo = {
      id: account.id,
      status: account.status,
      currency: account.currency,
      buyingPower: parseFloat(account.buying_power),
      cash: parseFloat(account.cash),
      portfolioValue: parseFloat(account.portfolio_value),
      equity: parseFloat(account.equity),
      longMarketValue: parseFloat(account.long_market_value || 0),
      shortMarketValue: parseFloat(account.short_market_value || 0),
      daytradeCount: account.daytrade_count,
      tradingBlocked: account.trading_blocked,
      transfersBlocked: account.transfers_blocked,
      accountBlocked: account.account_blocked,
      patternDayTrader: account.pattern_day_trader
    };
    
    res.json(accountInfo);
  } catch (error) {
    console.error('Error fetching account info:', error);
    res.status(500).json({ error: 'Failed to fetch account information' });
  }
});

// Place a new order
router.post('/order', async (req, res) => {
  try {
    const { symbol, qty, side, type, time_in_force, limit_price, stop_price } = req.body;
    
    // Validate required fields
    if (!symbol || !qty || !side || !type) {
      return res.status(400).json({ error: 'Missing required fields: symbol, qty, side, type' });
    }
    
    // Check if trading is enabled
    if (process.env.TRADING_ENABLED !== 'true') {
      return res.status(403).json({ error: 'Trading is currently disabled' });
    }
    
    // Validate order parameters
    const orderParams = {
      symbol: symbol.toUpperCase(),
      qty: Math.abs(parseFloat(qty)),
      side: side.toLowerCase(), // 'buy' or 'sell'
      type: type.toLowerCase(), // 'market', 'limit', 'stop', 'stop_limit'
      time_in_force: time_in_force || 'day' // 'day', 'gtc', 'ioc', 'fok'
    };
    
    // Add price parameters for limit/stop orders
    if (type.toLowerCase() === 'limit' && limit_price) {
      orderParams.limit_price = parseFloat(limit_price);
    }
    
    if (type.toLowerCase().includes('stop') && stop_price) {
      orderParams.stop_price = parseFloat(stop_price);
    }
    
    // Check position size limits
    const maxPositionSize = parseFloat(process.env.MAX_POSITION_SIZE || 10000);
    const orderValue = orderParams.qty * (limit_price || 100); // Rough estimate
    
    if (orderValue > maxPositionSize) {
      return res.status(400).json({ 
        error: `Order value exceeds maximum position size of $${maxPositionSize}` 
      });
    }
    
    // Check for existing conflicting orders to prevent wash trades
    try {
      const existingOrders = await alpaca.getOrders({
        status: 'open',
        symbols: orderParams.symbol
      });
      
      // Find orders with opposite side for the same symbol
      const conflictingOrders = existingOrders.filter(order => 
        order.symbol === orderParams.symbol && 
        order.side !== orderParams.side &&
        ['new', 'pending_new', 'accepted', 'pending_replace'].includes(order.status)
      );
      
      // Cancel conflicting orders to prevent wash trade detection
      if (conflictingOrders.length > 0) {
        console.log(`Canceling ${conflictingOrders.length} conflicting orders for ${orderParams.symbol}`);
        for (const conflictingOrder of conflictingOrders) {
          try {
            await alpaca.cancelOrder(conflictingOrder.id);
            console.log(`Canceled conflicting order: ${conflictingOrder.id}`);
          } catch (cancelError) {
            console.warn(`Failed to cancel order ${conflictingOrder.id}:`, cancelError.message);
          }
        }
        
        // Wait a moment for cancellations to process
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (orderCheckError) {
      console.warn('Error checking for conflicting orders:', orderCheckError.message);
    }
    
    // Place the order
    const order = await alpaca.createOrder(orderParams);
    
    res.json({
      success: true,
      order: {
        id: order.id,
        symbol: order.symbol,
        qty: order.qty,
        side: order.side,
        type: order.order_type,
        status: order.status,
        timeInForce: order.time_in_force,
        limitPrice: order.limit_price,
        stopPrice: order.stop_price,
        submittedAt: order.submitted_at,
        filledAt: order.filled_at,
        filledQty: order.filled_qty,
        filledAvgPrice: order.filled_avg_price
      }
    });
  } catch (error) {
    console.error('Error placing order:', error);
    
    // Handle specific Alpaca API errors
    let statusCode = 500;
    let errorMessage = 'Failed to place order';
    let errorDetails = error.message;
    
    if (error.response && error.response.data) {
      const alpacaError = error.response.data;
      
      switch (alpacaError.code) {
        case 40310000:
          statusCode = 409;
          errorMessage = 'Wash trade detected';
          errorDetails = 'Cannot place order due to existing opposite side order. Try canceling existing orders first.';
          break;
        case 40110000:
          statusCode = 400;
          errorMessage = 'Insufficient buying power';
          errorDetails = 'Not enough funds to place this order.';
          break;
        case 42210000:
          statusCode = 400;
          errorMessage = 'Invalid order';
          errorDetails = 'Order parameters are invalid or market is closed.';
          break;
        default:
          errorDetails = alpacaError.message || error.message;
      }
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: errorDetails,
      code: error.response?.data?.code
    });
  }
});

// Get all orders
router.get('/orders', async (req, res) => {
  try {
    const { status, limit = 50, after, until, direction = 'desc' } = req.query;
    
    const params = {
      limit: Math.min(parseInt(limit), 500),
      direction
    };
    
    if (status) params.status = status;
    if (after) params.after = after;
    if (until) params.until = until;
    
    const orders = await alpaca.getOrders(params);
    
    const formattedOrders = orders.map(order => ({
      id: order.id,
      symbol: order.symbol,
      qty: order.qty,
      side: order.side,
      type: order.order_type,
      status: order.status,
      timeInForce: order.time_in_force,
      limitPrice: order.limit_price,
      stopPrice: order.stop_price,
      submittedAt: order.submitted_at,
      filledAt: order.filled_at,
      filledQty: order.filled_qty,
      filledAvgPrice: order.filled_avg_price,
      canceledAt: order.canceled_at,
      expiredAt: order.expired_at,
      replacedAt: order.replaced_at
    }));
    
    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get specific order by ID
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await alpaca.getOrder(orderId);
    
    const formattedOrder = {
      id: order.id,
      symbol: order.symbol,
      qty: order.qty,
      side: order.side,
      type: order.order_type,
      status: order.status,
      timeInForce: order.time_in_force,
      limitPrice: order.limit_price,
      stopPrice: order.stop_price,
      submittedAt: order.submitted_at,
      filledAt: order.filled_at,
      filledQty: order.filled_qty,
      filledAvgPrice: order.filled_avg_price,
      canceledAt: order.canceled_at,
      expiredAt: order.expired_at,
      replacedAt: order.replaced_at
    };
    
    res.json(formattedOrder);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Cancel an order
router.delete('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    await alpaca.cancelOrder(orderId);
    
    res.json({ success: true, message: 'Order canceled successfully' });
  } catch (error) {
    console.error('Error canceling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Cancel all orders
router.delete('/orders', async (req, res) => {
  try {
    await alpaca.cancelAllOrders();
    res.json({ success: true, message: 'All orders canceled successfully' });
  } catch (error) {
    console.error('Error canceling all orders:', error);
    res.status(500).json({ error: 'Failed to cancel all orders' });
  }
});

// Get market data for a symbol
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Get latest quote
    const quote = await alpaca.getLatestTrade(symbol);
    
    res.json({
      symbol: symbol.toUpperCase(),
      price: quote.Price,
      timestamp: quote.Timestamp,
      size: quote.Size
    });
  } catch (error) {
    console.error(`Error fetching quote for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Get historical bars for a symbol
router.get('/bars/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1Day', start, end, limit = 100 } = req.query;
    
    const params = {
      timeframe,
      limit: Math.min(parseInt(limit), 1000)
    };
    
    if (start) params.start = start;
    if (end) params.end = end;
    
    const bars = await alpaca.getBarsV2(symbol, params);
    
    res.json({
      symbol: symbol.toUpperCase(),
      bars: bars.bars || []
    });
  } catch (error) {
    console.error(`Error fetching bars for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

// Execute AI agent trading decision
router.post('/agent-trade', async (req, res) => {
  try {
    const { symbol, action, confidence, reasoning, riskLevel } = req.body;
    
    // Validate AI agent decision
    if (!symbol || !action || !confidence) {
      return res.status(400).json({ error: 'Missing required fields from AI agent' });
    }
    
    // Check confidence threshold
    const minConfidence = parseFloat(process.env.MIN_CONFIDENCE || 0.7);
    if (confidence < minConfidence) {
      return res.json({ 
        success: false, 
        message: `Confidence ${confidence} below threshold ${minConfidence}`,
        reasoning 
      });
    }
    
    // Calculate position size based on risk level and confidence
    const account = await alpaca.getAccount();
    const buyingPower = parseFloat(account.buying_power);
    const riskTolerance = parseFloat(process.env.RISK_TOLERANCE || 0.02);
    
    let positionSize;
    switch (riskLevel) {
      case 'low':
        positionSize = buyingPower * riskTolerance * 0.5;
        break;
      case 'medium':
        positionSize = buyingPower * riskTolerance;
        break;
      case 'high':
        positionSize = buyingPower * riskTolerance * 1.5;
        break;
      default:
        positionSize = buyingPower * riskTolerance;
    }
    
    // Adjust position size by confidence
    positionSize *= confidence;
    
    // Get current price to calculate quantity
    const quote = await alpaca.getLatestTrade(symbol);
    const currentPrice = quote.Price;
    const qty = Math.floor(positionSize / currentPrice);
    
    if (qty < 1) {
      return res.json({ 
        success: false, 
        message: 'Calculated quantity is less than 1 share',
        positionSize,
        currentPrice 
      });
    }
    
    // Prepare order parameters
    const orderParams = {
      symbol: symbol.toUpperCase(),
      qty,
      side: action.toLowerCase(), // 'buy' or 'sell'
      type: 'market',
      time_in_force: 'day'
    };
    
    // Check for existing conflicting orders to prevent wash trades
    try {
      const existingOrders = await alpaca.getOrders({
        status: 'open',
        symbols: orderParams.symbol
      });
      
      // Find orders with opposite side for the same symbol
      const conflictingOrders = existingOrders.filter(order => 
        order.symbol === orderParams.symbol && 
        order.side !== orderParams.side &&
        ['new', 'pending_new', 'accepted', 'pending_replace'].includes(order.status)
      );
      
      // Cancel conflicting orders to prevent wash trade detection
      if (conflictingOrders.length > 0) {
        console.log(`AI Agent: Canceling ${conflictingOrders.length} conflicting orders for ${orderParams.symbol}`);
        for (const conflictingOrder of conflictingOrders) {
          try {
            await alpaca.cancelOrder(conflictingOrder.id);
            console.log(`AI Agent: Canceled conflicting order: ${conflictingOrder.id}`);
          } catch (cancelError) {
            console.warn(`AI Agent: Failed to cancel order ${conflictingOrder.id}:`, cancelError.message);
          }
        }
        
        // Wait a moment for cancellations to process
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (orderCheckError) {
      console.warn('AI Agent: Error checking for conflicting orders:', orderCheckError.message);
    }
    
    // Place the order
    const order = await alpaca.createOrder(orderParams);

    // Broadcast trading decision to WebSocket clients for Decision History
    try {
      // Use a global registry to avoid circular dependencies
      if (global.wsIntegration) {
        const tradingDecision = {
          id: order.id,
          symbol: order.symbol,
          action: order.side,
          quantity: order.qty,
          confidence: Math.round(confidence * 100), // Convert to percentage
          reasoning: reasoning,
          riskLevel: riskLevel,
          price: null, // Market order
          timestamp: new Date().toISOString(),
          source: 'ai_agent'
        };
        
        global.wsIntegration.broadcastTradingDecision(tradingDecision);
        console.log('AI Agent: Broadcasting trading decision to WebSocket clients:', tradingDecision);
      }
    } catch (wsError) {
      console.error('AI Agent: Error broadcasting trading decision to WebSocket:', wsError);
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        symbol: order.symbol,
        qty: order.qty,
        side: order.side,
        status: order.status,
        reasoning,
        confidence,
        riskLevel,
        submittedAt: order.submitted_at
      }
    });
  } catch (error) {
    console.error('Error executing AI agent trade:', error);
    
    // Handle specific Alpaca API errors
    let statusCode = 500;
    let errorMessage = 'Failed to execute AI agent trade';
    let errorDetails = error.message;
    
    if (error.response && error.response.data) {
      const alpacaError = error.response.data;
      
      switch (alpacaError.code) {
        case 40310000:
          statusCode = 409;
          errorMessage = 'AI Agent: Wash trade detected';
          errorDetails = 'Cannot execute trade due to existing opposite side order. Conflicting orders should have been canceled automatically.';
          break;
        case 40110000:
          statusCode = 400;
          errorMessage = 'AI Agent: Insufficient buying power';
          errorDetails = 'Not enough funds to execute this AI agent trade.';
          break;
        case 42210000:
          statusCode = 400;
          errorMessage = 'AI Agent: Invalid order';
          errorDetails = 'AI agent order parameters are invalid or market is closed.';
          break;
        default:
          errorDetails = alpacaError.message || error.message;
      }
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: errorDetails,
      code: error.response?.data?.code
    });
  }
});

// Execute AI-suggested trade
router.post('/execute', async (req, res) => {
  try {
    const { symbol, side, qty, type, time_in_force, source, reasoning } = req.body;
    
    // Validate required fields
    if (!symbol || !side || !qty) {
      return res.status(400).json({ error: 'Missing required fields: symbol, side, qty' });
    }
    
    // Check if trading is enabled
    if (process.env.TRADING_ENABLED !== 'true') {
      return res.status(403).json({ error: 'Trading is currently disabled' });
    }
    
    // Prepare order parameters
    const orderParams = {
      symbol: symbol.toUpperCase(),
      qty: Math.abs(parseFloat(qty)),
      side: side.toLowerCase(),
      type: type || 'market',
      time_in_force: time_in_force || 'day'
    };
    
    // Check for existing conflicting orders to prevent wash trades
    try {
      const existingOrders = await alpaca.getOrders({
        status: 'open',
        symbols: orderParams.symbol
      });
      
      const conflictingOrders = existingOrders.filter(order => 
        order.symbol === orderParams.symbol && 
        order.side !== orderParams.side &&
        ['new', 'pending_new', 'accepted', 'pending_replace'].includes(order.status)
      );
      
      if (conflictingOrders.length > 0) {
        console.log(`AI Trade: Canceling ${conflictingOrders.length} conflicting orders for ${orderParams.symbol}`);
        for (const conflictingOrder of conflictingOrders) {
          try {
            await alpaca.cancelOrder(conflictingOrder.id);
          } catch (cancelError) {
            console.warn(`AI Trade: Failed to cancel order ${conflictingOrder.id}:`, cancelError.message);
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (orderCheckError) {
      console.warn('AI Trade: Error checking for conflicting orders:', orderCheckError.message);
    }
    
    // Place the order
    const order = await alpaca.createOrder(orderParams);
    
    // Record the decision in performance tracking if source is AI suggestion
    if (source === 'ai_suggestion') {
      try {
        const account = await alpaca.getAccount();
        const portfolioData = {
          totalValue: parseFloat(account.portfolio_value),
          dayChange: parseFloat(account.unrealized_pl || 0),
          buyingPower: parseFloat(account.buying_power)
        };
        
        const decision = {
          action: side,
          symbol: symbol.toUpperCase(),
          quantity: qty,
          price: null, // Market order
          reasoning: reasoning || 'AI-generated trade suggestion'
        };
        
        await performanceTracking.recordTradingDecision('ai_agent', decision, portfolioData);
      } catch (trackingError) {
        console.error('Error recording AI trade decision:', trackingError);
      }
    }
    
    res.json({
      success: true,
      order: {
        id: order.id,
        symbol: order.symbol,
        qty: order.qty,
        side: order.side,
        type: order.order_type,
        status: order.status,
        timeInForce: order.time_in_force,
        submittedAt: order.submitted_at,
        source: source || 'manual'
      }
    });
  } catch (error) {
    console.error('Error executing AI trade:', error);
    
    let statusCode = 500;
    let errorMessage = 'Failed to execute trade';
    let errorDetails = error.message;
    
    if (error.response && error.response.data) {
      const alpacaError = error.response.data;
      
      switch (alpacaError.code) {
        case 40310000:
          statusCode = 409;
          errorMessage = 'Wash trade detected';
          errorDetails = 'Cannot place order due to existing opposite side order.';
          break;
        case 40110000:
          statusCode = 400;
          errorMessage = 'Insufficient buying power';
          errorDetails = 'Not enough funds to place this order.';
          break;
        case 42210000:
          statusCode = 400;
          errorMessage = 'Invalid order';
          errorDetails = 'Order parameters are invalid or market is closed.';
          break;
        default:
          errorDetails = alpacaError.message || error.message;
      }
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      message: errorDetails,
      code: error.response?.data?.code
    });
  }
});

module.exports = router;