const express = require('express');
const axios = require('axios');
const Core = require('@alicloud/pop-core');
const config = require('../config');
const router = express.Router();

// Initialize Alibaba Cloud client (only if enabled)
let client = null;
if (config.alibabaCloud.enabled && config.alibabaCloud.accessKeyId && config.functionCompute.endpoint) {
  client = new Core({
    accessKeyId: config.alibabaCloud.accessKeyId,
    accessKeySecret: config.alibabaCloud.accessKeySecret,
    endpoint: config.functionCompute.endpoint,
    apiVersion: config.functionCompute.apiVersion
  });
}

// Agent personalities and configurations
const agentConfigs = {
  'conservative-agent': {
    name: 'Conservative Agent',
    personality: 'Risk-averse, focuses on stable investments',
    riskTolerance: 'low',
    maxPositionSize: 0.05, // 5% of portfolio
    minConfidence: 0.8,
    preferredAssets: ['blue-chip stocks', 'bonds', 'dividend stocks'],
    tradingStyle: 'long-term'
  },
  'aggressive-agent': {
    name: 'Aggressive Agent', 
    personality: 'High-risk, high-reward focused',
    riskTolerance: 'high',
    maxPositionSize: 0.15, // 15% of portfolio
    minConfidence: 0.6,
    preferredAssets: ['growth stocks', 'tech stocks', 'volatile assets'],
    tradingStyle: 'short-term'
  },
  'data-driven-agent': {
    name: 'Data-Driven Agent',
    personality: 'Analytical, relies on technical indicators',
    riskTolerance: 'medium',
    maxPositionSize: 0.10, // 10% of portfolio
    minConfidence: 0.75,
    preferredAssets: ['index funds', 'etfs', 'diversified portfolio'],
    tradingStyle: 'medium-term'
  }
};

// Get available agents
router.get('/agents', (req, res) => {
  const agents = Object.entries(agentConfigs).map(([id, config]) => ({
    id,
    name: config.name,
    personality: config.personality,
    riskLevel: config.riskTolerance,
    tradingStyle: config.tradingStyle,
    preferredAssets: config.preferredAssets
  }));
  
  res.json(agents);
});

// Get specific agent configuration
router.get('/agents/:agentId', (req, res) => {
  const { agentId } = req.params;
  const config = agentConfigs[agentId];
  
  if (!config) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  res.json({ id: agentId, ...config });
});

// Get trading decision from AI agent
router.post('/decision', async (req, res) => {
  try {
    const { agentId, marketData, newsData, portfolioData } = req.body;
    
    if (!agentId || !agentConfigs[agentId]) {
      return res.status(400).json({ error: 'Invalid agent ID' });
    }
    
    const agentConfig = agentConfigs[agentId];
    
    // Prepare data for AI agent
    const agentInput = {
      agentConfig,
      marketData: marketData || {},
      newsData: newsData || [],
      portfolioData: portfolioData || {},
      timestamp: new Date().toISOString()
    };
    
    // Call Alibaba Cloud Function Compute
    let decision;
    try {
      decision = await callAlibabaTradingFunction(agentInput);
    } catch (fcError) {
      console.error('Function Compute error, using fallback:', fcError);
      // Fallback to local decision making
      decision = await generateLocalDecision(agentInput);
    }
    
    res.json(decision);
  } catch (error) {
    console.error('Error getting agent decision:', error);
    res.status(500).json({ error: 'Failed to get trading decision' });
  }
});

// Call Alibaba Cloud Function Compute for AI decision
const callAlibabaTradingFunction = async (input) => {
  // If Alibaba Cloud is not configured, fall back to local decision
  if (!client) {
    console.log('Alibaba Cloud not configured, using local decision making');
    return await generateLocalDecision(input);
  }
  
  try {
    const params = {
      serviceName: config.functionCompute.serviceName,
      functionName: config.functionCompute.functionName,
      payload: JSON.stringify(input)
    };
    
    const result = await client.request('InvokeFunction', params, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return JSON.parse(result.payload);
  } catch (error) {
    console.error('Alibaba Function Compute error:', error);
    console.log('Falling back to local decision making');
    return await generateLocalDecision(input);
  }
};

// Fallback local decision making
const generateLocalDecision = async (input) => {
  const { agentConfig, marketData, newsData, portfolioData } = input;
  
  // Simple decision logic based on agent personality
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
  const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
  
  // Analyze news sentiment
  const newsSentiment = analyzeNewsSentiment(newsData);
  
  // Generate decision based on agent type
  let action, confidence, reasoning;
  
  switch (agentConfig.riskTolerance) {
    case 'low': // Conservative agent
      action = newsSentiment > 0.3 ? 'buy' : 'hold';
      confidence = Math.min(0.9, 0.6 + Math.abs(newsSentiment) * 0.3);
      reasoning = `Conservative approach: ${newsSentiment > 0 ? 'Positive' : 'Negative'} market sentiment detected. Proceeding with caution.`;
      break;
      
    case 'high': // Aggressive agent
      action = newsSentiment > 0 ? 'buy' : (newsSentiment < -0.2 ? 'sell' : 'hold');
      confidence = Math.min(0.95, 0.5 + Math.abs(newsSentiment) * 0.4);
      reasoning = `Aggressive strategy: Strong ${newsSentiment > 0 ? 'bullish' : 'bearish'} signals. Taking decisive action.`;
      break;
      
    default: // Data-driven agent
      action = newsSentiment > 0.1 ? 'buy' : (newsSentiment < -0.1 ? 'sell' : 'hold');
      confidence = Math.min(0.85, 0.65 + Math.abs(newsSentiment) * 0.2);
      reasoning = `Data analysis shows ${newsSentiment.toFixed(2)} sentiment score. Balanced approach recommended.`;
  }
  
  return {
    agentId: input.agentConfig.name,
    symbol: randomSymbol,
    action,
    confidence,
    reasoning,
    riskLevel: agentConfig.riskTolerance,
    timestamp: new Date().toISOString(),
    factors: {
      newsSentiment,
      marketCondition: 'normal',
      portfolioBalance: 'adequate'
    }
  };
};

// Analyze news sentiment
const analyzeNewsSentiment = (newsData) => {
  if (!newsData || newsData.length === 0) return 0;
  
  const sentimentScores = newsData.map(news => {
    switch (news.sentiment) {
      case 'positive': return 1;
      case 'negative': return -1;
      default: return 0;
    }
  });
  
  const avgSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
  return avgSentiment;
};

// Start automated trading for an agent
router.post('/start-trading/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { interval = 300000 } = req.body; // Default 5 minutes
    
    if (!agentConfigs[agentId]) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // In a real implementation, you'd store this in a database
    // For now, we'll just acknowledge the request
    res.json({
      success: true,
      message: `Started automated trading for ${agentConfigs[agentId].name}`,
      agentId,
      interval,
      status: 'active'
    });
  } catch (error) {
    console.error('Error starting automated trading:', error);
    res.status(500).json({ error: 'Failed to start automated trading' });
  }
});

// Stop automated trading for an agent
router.post('/stop-trading/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!agentConfigs[agentId]) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({
      success: true,
      message: `Stopped automated trading for ${agentConfigs[agentId].name}`,
      agentId,
      status: 'inactive'
    });
  } catch (error) {
    console.error('Error stopping automated trading:', error);
    res.status(500).json({ error: 'Failed to stop automated trading' });
  }
});

// Get agent trading history
router.get('/history/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    if (!agentConfigs[agentId]) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // In a real implementation, you'd fetch from database
    // For now, return sample data
    const sampleHistory = [
      {
        id: 1,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        symbol: 'AAPL',
        action: 'buy',
        quantity: 10,
        price: 185.43,
        confidence: 0.85,
        reasoning: 'Strong positive sentiment in tech sector',
        status: 'executed'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        symbol: 'MSFT',
        action: 'sell',
        quantity: 5,
        price: 348.10,
        confidence: 0.78,
        reasoning: 'Taking profits after recent gains',
        status: 'executed'
      }
    ];
    
    res.json({
      agentId,
      history: sampleHistory.slice(offset, offset + parseInt(limit)),
      total: sampleHistory.length
    });
  } catch (error) {
    console.error('Error fetching agent history:', error);
    res.status(500).json({ error: 'Failed to fetch agent history' });
  }
});

// Get agent performance metrics
router.get('/performance/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!agentConfigs[agentId]) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Sample performance data
    const performance = {
      agentId,
      totalTrades: 25,
      successfulTrades: 18,
      successRate: 0.72,
      totalReturn: 0.124, // 12.4%
      sharpeRatio: 1.45,
      maxDrawdown: -0.08, // -8%
      avgHoldingPeriod: '2.3 days',
      lastActive: new Date().toISOString(),
      riskAdjustedReturn: 0.089
    };
    
    res.json(performance);
  } catch (error) {
    console.error('Error fetching agent performance:', error);
    res.status(500).json({ error: 'Failed to fetch agent performance' });
  }
});

module.exports = router;