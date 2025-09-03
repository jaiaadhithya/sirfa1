const express = require('express');
const router = express.Router();
const Alpaca = require('@alpacahq/alpaca-trade-api');
const qwenService = require('../services/qwenService');
const { getAgentProfile, getAllAgents, validateTradingDecision } = require('../config/agentProfiles');
const riskManagement = require('../services/riskManagement');
const performanceTracking = require('../services/performanceTracking');
const config = require('../config');

// Initialize Alpaca client
const alpaca = new Alpaca({
  keyId: process.env.ALPACA_API_KEY,
  secretKey: process.env.ALPACA_SECRET_KEY,
  baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
  dataBaseUrl: process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets'
});

// Store agent sessions and conversation history
const agentSessions = new Map();
const conversationHistory = new Map();

/**
 * Get all available AI agents
 */
router.get('/', (req, res) => {
  try {
    const agents = getAllAgents().map(agent => ({
      id: agent.id,
      name: agent.name,
      title: agent.title,
      description: agent.description,
      avatar: agent.avatar,
      investmentStyle: agent.investmentStyle,
      riskTolerance: agent.riskTolerance,
      timeHorizon: agent.timeHorizon,
      preferredSectors: agent.preferredSectors
    }));

    res.json({
      success: true,
      agents
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI agents'
    });
  }
});

/**
 * Get specific agent details
 */
router.get('/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = getAgentProfile(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent details'
    });
  }
});

/**
 * Start a session with an AI agent
 */
router.post('/:agentId/session', (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = getAgentProfile(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    const sessionId = `${agentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    agentSessions.set(sessionId, {
      agentId,
      startTime: new Date(),
      lastActivity: new Date(),
      active: true
    });

    conversationHistory.set(sessionId, []);

    res.json({
      success: true,
      sessionId,
      agent: {
        id: agent.id,
        name: agent.name,
        title: agent.title,
        avatar: agent.avatar,
        greeting: `Hello! I'm ${agent.name}, ${agent.description}. I'm here to help you with your investment decisions based on my ${agent.investmentStyle.toLowerCase()} approach. What would you like to discuss today?`
      }
    });
  } catch (error) {
    console.error('Error starting agent session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start agent session'
    });
  }
});

/**
 * Get trading analysis from an AI agent
 */
router.post('/:agentId/analyze', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = getAgentProfile(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Get current market data
    const marketData = await getCurrentMarketData();
    
    // Get portfolio data
    const portfolioData = await getPortfolioData();

    // Generate AI analysis
    const analysis = await qwenService.generateTradingAnalysis(
      marketData,
      agent,
      portfolioData,
      config.alpaca
    );

    // Validate the trading decision with risk management
    const riskValidation = riskManagement.validateTradingDecision(agentId, analysis.recommendation, portfolioData);
    
    if (!riskValidation.approved) {
      if (riskValidation.adjustedDecision) {
        analysis.recommendation = riskValidation.adjustedDecision;
        analysis.reasoning += ` Note: Trade adjusted due to risk limits: ${riskValidation.reason}`;
      } else {
        analysis.recommendation.action = 'HOLD';
        analysis.reasoning += ` Note: Trade blocked due to risk limits: ${riskValidation.reason}`;
      }
    }
    
    // Add risk metrics to the response
    analysis.riskMetrics = riskValidation.riskMetrics;

    // Record the trading decision for performance tracking
    const decisionId = await performanceTracking.recordTradingDecision(
      agentId,
      analysis.recommendation,
      portfolioData,
      req.body.sessionId
    );

    res.json({
      success: true,
      analysis,
      marketData,
      decisionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating trading analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate trading analysis'
    });
  }
});

/**
 * Ask portfolio-specific questions to AI agent
 */
router.post('/:agentId/portfolio-query', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { question, sessionId } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    const agent = getAgentProfile(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Get comprehensive portfolio data
    const portfolioData = await getComprehensivePortfolioData();
    
    // Create portfolio-focused context
    const context = {
      portfolioData: portfolioData,
      queryType: 'portfolio-analysis'
    };

    // Generate portfolio-specific response with trade suggestions
    const aiResult = await qwenService.generatePortfolioAwareConversation(question, agent, context);

    res.json({
      success: true,
      response: aiResult.response,
      tradeSuggestions: aiResult.tradeSuggestions || [],
      agentId,
      portfolioSummary: {
        totalValue: portfolioData.totalValue,
        positionCount: portfolioData.positionCount,
        dayChange: portfolioData.dayChange,
        dayChangePercent: portfolioData.dayChangePercent
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in portfolio query:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process portfolio query'
    });
  }
});

/**
 * Chat with an AI agent
 */
router.post('/:agentId/chat', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const agent = getAgentProfile(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Get comprehensive portfolio data for AI context
    const portfolioData = await getComprehensivePortfolioData();
    
    // Get conversation context
    const history = conversationHistory.get(sessionId) || [];
    const context = {
      recentMessages: history.slice(-5), // Last 5 messages for context
      portfolioSummary: await getPortfolioSummary(), // Keep for backward compatibility
      portfolioData: portfolioData // Enhanced portfolio data
    };

    // Generate AI response with portfolio-aware prompt and trade suggestions
    const aiResult = await qwenService.generatePortfolioAwareConversation(message, agent, context);

    // Update conversation history
    const conversationEntry = {
      timestamp: new Date().toISOString(),
      userMessage: message,
      agentResponse: aiResult.response
    };

    if (sessionId && conversationHistory.has(sessionId)) {
      conversationHistory.get(sessionId).push(conversationEntry);
      
      // Update session activity
      const session = agentSessions.get(sessionId);
      if (session) {
        session.lastActivity = new Date();
      }
    }

    res.json({
      success: true,
      response: aiResult.response,
      tradeSuggestions: aiResult.tradeSuggestions || [],
      agentId,
      timestamp: conversationEntry.timestamp
    });
  } catch (error) {
    console.error('Error in agent chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message'
    });
  }
});

/**
 * Get conversation history for a session
 */
router.get('/session/:sessionId/history', (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = conversationHistory.get(sessionId) || [];
    
    res.json({
      success: true,
      history,
      sessionId
    });
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation history'
    });
  }
});

/**
 * End an agent session
 */
router.delete('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (agentSessions.has(sessionId)) {
      const session = agentSessions.get(sessionId);
      session.active = false;
      session.endTime = new Date();
    }

    res.json({
      success: true,
      message: 'Session ended successfully'
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end session'
    });
  }
});

/**
 * Get risk limits for an agent
 */
router.get('/:agentId/risk-limits', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = getAgentProfile(agentId);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const riskLimits = riskManagement.getRiskLimits(agentId);
    
    if (!riskLimits) {
      return res.status(404).json({ error: 'Risk limits not found for agent' });
    }

    res.json({
      success: true,
      agentId,
      agentName: agent.name,
      riskProfile: agent.riskTolerance,
      limits: riskLimits
    });

  } catch (error) {
    console.error('Get risk limits error:', error);
    res.status(500).json({ error: 'Failed to get risk limits' });
  }
 });
 
 // Get agent performance analytics
 router.get('/:agentId/performance', async (req, res) => {
   try {
     const { agentId } = req.params;
     const { timeframe = '30d' } = req.query;
     
     const agent = getAgentProfile(agentId);
     if (!agent) {
       return res.status(404).json({ error: 'Agent not found' });
     }
 
     const performance = performanceTracking.getAgentPerformance(agentId, timeframe);
     
     if (!performance) {
       return res.json({
         success: true,
         agentId,
         agentName: agent.name,
         timeframe,
         summary: {
           totalDecisions: 0,
           executedTrades: 0,
           successfulTrades: 0,
           totalReturn: 0,
           averageReturn: 0,
           winRate: 0,
           sharpeRatio: 0,
           maxDrawdown: 0,
           volatility: 0
         },
         recentDecisions: [],
         dailyPerformance: {}
       });
     }
 
     res.json({
       success: true,
       ...performance
     });
 
   } catch (error) {
     console.error('Get agent performance error:', error);
     res.status(500).json({ error: 'Failed to get agent performance' });
   }
 });
 
 // Get comparative performance of all agents
 router.get('/performance/comparative', async (req, res) => {
   try {
     const { timeframe = '30d' } = req.query;
     
     const comparative = performanceTracking.getComparativePerformance(timeframe);
     
     res.json({
       success: true,
       ...comparative
     });
 
   } catch (error) {
     console.error('Get comparative performance error:', error);
     res.status(500).json({ error: 'Failed to get comparative performance' });
   }
 });
 
 // Get performance leaderboard
 router.get('/performance/leaderboard', async (req, res) => {
   try {
     const { metric = 'totalReturn', timeframe = '30d' } = req.query;
     
     const leaderboard = performanceTracking.getLeaderboard(metric, timeframe);
     
     res.json({
       success: true,
       ...leaderboard
     });
 
   } catch (error) {
     console.error('Get leaderboard error:', error);
     res.status(500).json({ error: 'Failed to get leaderboard' });
   }
 });
 
 // Update trading outcome (for when trades are actually executed)
 router.post('/:agentId/decisions/:decisionId/outcome', async (req, res) => {
   try {
     const { agentId, decisionId } = req.params;
     const outcome = req.body;
     
     const agent = getAgentProfile(agentId);
     if (!agent) {
       return res.status(404).json({ error: 'Agent not found' });
     }
 
     const success = await performanceTracking.updateTradingOutcome(agentId, decisionId, outcome);
     
     if (!success) {
       return res.status(404).json({ error: 'Decision not found or update failed' });
     }
 
     res.json({
       success: true,
       message: 'Trading outcome updated successfully'
     });
 
   } catch (error) {
     console.error('Update trading outcome error:', error);
     res.status(500).json({ error: 'Failed to update trading outcome' });
   }
 });
 
 // Helper functions

/**
 * Get current market data
 */
async function getCurrentMarketData() {
  try {
    // This would typically fetch from multiple sources
    // For now, we'll return mock data or basic market info
    return {
      sp500: { price: 4500, change: 0.5 },
      nasdaq: { price: 14000, change: 0.8 },
      vix: { price: 18.5 },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching market data:', error);
    return {};
  }
}

/**
 * Get portfolio data
 */
async function getPortfolioData() {
  try {
    const account = await alpaca.getAccount();
    const positions = await alpaca.getPositions();
    
    return {
      totalValue: parseFloat(account.portfolio_value),
      buyingPower: parseFloat(account.buying_power),
      dayChange: parseFloat(account.unrealized_pl),
      dayChangePercent: parseFloat(account.unrealized_plpc) * 100,
      positions: positions.map(pos => ({
        symbol: pos.symbol,
        qty: parseFloat(pos.qty),
        market_value: parseFloat(pos.market_value),
        unrealized_pl: parseFloat(pos.unrealized_pl)
      }))
    };
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    return {
      totalValue: 10000,
      buyingPower: 5000,
      dayChange: 0,
      dayChangePercent: 0,
      positions: []
    };
  }
}

/**
 * Get comprehensive portfolio data for AI context
 */
async function getComprehensivePortfolioData() {
  try {
    const account = await alpaca.getAccount();
    const positions = await alpaca.getPositions();
    
    // Get portfolio allocation data
    const axios = require('axios');
    let allocation = [];
    try {
      const allocationResponse = await axios.get('http://localhost:3001/api/portfolio/allocation');
      allocation = allocationResponse.data;
    } catch (err) {
      console.warn('Could not fetch allocation data:', err.message);
    }
    
    const totalValue = parseFloat(account.portfolio_value);
    const buyingPower = parseFloat(account.buying_power);
    const dayChange = parseFloat(account.unrealized_pl);
    const dayChangePercent = parseFloat(account.unrealized_plpc) * 100;
    
    // Process positions with detailed information
    const detailedPositions = positions.map(pos => {
      const marketValue = parseFloat(pos.market_value);
      const qty = parseFloat(pos.qty);
      const avgCost = parseFloat(pos.avg_cost);
      const unrealizedPL = parseFloat(pos.unrealized_pl);
      const unrealizedPLPercent = parseFloat(pos.unrealized_plpc) * 100;
      
      return {
        symbol: pos.symbol,
        quantity: qty,
        averageCost: avgCost,
        currentValue: marketValue,
        unrealizedPL: unrealizedPL,
        unrealizedPLPercent: unrealizedPLPercent,
        percentOfPortfolio: totalValue > 0 ? (Math.abs(marketValue) / totalValue * 100) : 0,
        side: pos.side
      };
    });
    
    // Sort positions by value (largest first)
    detailedPositions.sort((a, b) => Math.abs(b.currentValue) - Math.abs(a.currentValue));
    
    // Calculate portfolio metrics
    const totalPositionsValue = detailedPositions.reduce((sum, pos) => sum + Math.abs(pos.currentValue), 0);
    const cashPercentage = totalValue > 0 ? (buyingPower / totalValue * 100) : 0;
    const totalUnrealizedPL = detailedPositions.reduce((sum, pos) => sum + pos.unrealizedPL, 0);
    
    // Get top gainers and losers
    const gainers = detailedPositions.filter(pos => pos.unrealizedPL > 0).slice(0, 3);
    const losers = detailedPositions.filter(pos => pos.unrealizedPL < 0).slice(0, 3);
    
    return {
      // Account overview
      totalValue: totalValue,
      buyingPower: buyingPower,
      dayChange: dayChange,
      dayChangePercent: dayChangePercent,
      cashPercentage: cashPercentage,
      
      // Positions summary
      positionCount: positions.length,
      totalPositionsValue: totalPositionsValue,
      totalUnrealizedPL: totalUnrealizedPL,
      
      // Detailed positions (top 10)
      positions: detailedPositions.slice(0, 10),
      
      // Top performers
      topGainers: gainers,
      topLosers: losers,
      
      // Sector allocation
      sectorAllocation: allocation,
      
      // Risk metrics
      riskMetrics: {
        concentrationRisk: detailedPositions.length > 0 ? detailedPositions[0].percentOfPortfolio : 0,
        diversificationScore: Math.min(positions.length * 10, 100), // Simple diversification score
        cashRatio: cashPercentage
      }
    };
  } catch (error) {
    console.error('Error fetching comprehensive portfolio data:', error);
    return {
      totalValue: 0,
      buyingPower: 0,
      dayChange: 0,
      dayChangePercent: 0,
      positionCount: 0,
      positions: [],
      topGainers: [],
      topLosers: [],
      sectorAllocation: [],
      riskMetrics: { concentrationRisk: 0, diversificationScore: 0, cashRatio: 100 }
    };
  }
}

/**
 * Get portfolio summary for context (legacy function for backward compatibility)
 */
async function getPortfolioSummary() {
  try {
    const portfolio = await getPortfolioData();
    return {
      totalValue: portfolio.totalValue,
      positionCount: portfolio.positions.length,
      topHoldings: portfolio.positions
        .sort((a, b) => Math.abs(b.market_value) - Math.abs(a.market_value))
        .slice(0, 3)
        .map(pos => pos.symbol)
    };
  } catch (error) {
    return { totalValue: 0, positionCount: 0, topHoldings: [] };
  }
}

// Cleanup inactive sessions (run every hour)
setInterval(() => {
  const now = new Date();
  const oneHour = 60 * 60 * 1000;
  
  for (const [sessionId, session] of agentSessions.entries()) {
    if (now - session.lastActivity > oneHour) {
      session.active = false;
      conversationHistory.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);

module.exports = router;