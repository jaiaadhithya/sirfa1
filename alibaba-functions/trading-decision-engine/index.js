const { v4: uuidv4 } = require('uuid');

/**
 * Alibaba Cloud Function Compute handler for AI trading decisions
 * This function analyzes market data, news sentiment, and portfolio information
 * to make intelligent trading decisions based on the selected agent personality
 */
exports.handler = async (event, context) => {
  const logger = context.logger;
  logger.info('Trading decision engine invoked');
  
  try {
    // Parse input data
    const input = typeof event === 'string' ? JSON.parse(event) : event;
    const { agentConfig, marketData, newsData, portfolioData, timestamp } = input;
    
    logger.info(`Processing decision for agent: ${agentConfig.name}`);
    
    // Validate input
    if (!agentConfig || !agentConfig.riskTolerance) {
      throw new Error('Invalid agent configuration');
    }
    
    // Analyze market conditions
    const marketAnalysis = analyzeMarketConditions(marketData, logger);
    
    // Analyze news sentiment
    const newsAnalysis = analyzeNewsSentiment(newsData, logger);
    
    // Analyze portfolio risk
    const portfolioAnalysis = analyzePortfolioRisk(portfolioData, agentConfig, logger);
    
    // Generate trading decision
    const decision = generateTradingDecision(
      agentConfig,
      marketAnalysis,
      newsAnalysis,
      portfolioAnalysis,
      logger
    );
    
    // Add metadata
    decision.id = uuidv4();
    decision.timestamp = new Date().toISOString();
    decision.processingTime = Date.now() - new Date(timestamp).getTime();
    
    logger.info(`Decision generated: ${decision.action} ${decision.symbol} with confidence ${decision.confidence}`);
    
    return {
      statusCode: 200,
      body: decision
    };
    
  } catch (error) {
    logger.error('Error in trading decision engine:', error);
    
    return {
      statusCode: 500,
      body: {
        error: 'Trading decision engine failed',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
};

/**
 * Analyze current market conditions
 */
function analyzeMarketConditions(marketData, logger) {
  logger.info('Analyzing market conditions');
  
  // Default market analysis if no data provided
  if (!marketData || Object.keys(marketData).length === 0) {
    return {
      trend: 'neutral',
      volatility: 'medium',
      volume: 'normal',
      score: 0
    };
  }
  
  // Analyze market trends, volatility, volume, etc.
  const analysis = {
    trend: determineTrend(marketData),
    volatility: calculateVolatility(marketData),
    volume: analyzeVolume(marketData),
    score: 0
  };
  
  // Calculate overall market score (-1 to 1)
  let score = 0;
  if (analysis.trend === 'bullish') score += 0.4;
  else if (analysis.trend === 'bearish') score -= 0.4;
  
  if (analysis.volatility === 'low') score += 0.2;
  else if (analysis.volatility === 'high') score -= 0.3;
  
  if (analysis.volume === 'high') score += 0.1;
  
  analysis.score = Math.max(-1, Math.min(1, score));
  
  return analysis;
}

/**
 * Analyze news sentiment and impact
 */
function analyzeNewsSentiment(newsData, logger) {
  logger.info('Analyzing news sentiment');
  
  if (!newsData || newsData.length === 0) {
    return {
      overallSentiment: 'neutral',
      score: 0,
      highImpactNews: 0,
      relevantNews: 0
    };
  }
  
  let totalScore = 0;
  let highImpactCount = 0;
  let relevantCount = 0;
  
  newsData.forEach(news => {
    let newsScore = 0;
    
    // Sentiment scoring
    switch (news.sentiment) {
      case 'positive':
        newsScore = 1;
        break;
      case 'negative':
        newsScore = -1;
        break;
      default:
        newsScore = 0;
    }
    
    // Weight by impact
    const impactWeight = news.impact === 'high' ? 2 : (news.impact === 'medium' ? 1.5 : 1);
    newsScore *= impactWeight;
    
    totalScore += newsScore;
    
    if (news.impact === 'high') highImpactCount++;
    if (news.relevantTickers && news.relevantTickers.length > 0) relevantCount++;
  });
  
  const avgScore = totalScore / newsData.length;
  
  return {
    overallSentiment: avgScore > 0.2 ? 'positive' : (avgScore < -0.2 ? 'negative' : 'neutral'),
    score: Math.max(-1, Math.min(1, avgScore)),
    highImpactNews: highImpactCount,
    relevantNews: relevantCount,
    totalNews: newsData.length
  };
}

/**
 * Analyze portfolio risk and diversification
 */
function analyzePortfolioRisk(portfolioData, agentConfig, logger) {
  logger.info('Analyzing portfolio risk');
  
  if (!portfolioData || !portfolioData.totalValue) {
    return {
      riskLevel: 'unknown',
      diversification: 'unknown',
      cashRatio: 0,
      canTrade: true
    };
  }
  
  const totalValue = portfolioData.totalValue || 0;
  const cash = portfolioData.buyingPower || 0;
  const cashRatio = totalValue > 0 ? cash / totalValue : 0;
  
  // Determine if we can make new trades based on agent config
  const maxPositionValue = totalValue * agentConfig.maxPositionSize;
  const canTrade = cash > maxPositionValue;
  
  return {
    riskLevel: cashRatio > 0.5 ? 'low' : (cashRatio > 0.2 ? 'medium' : 'high'),
    diversification: 'adequate', // Simplified
    cashRatio,
    canTrade,
    maxPositionValue
  };
}

/**
 * Generate trading decision based on all analyses
 */
function generateTradingDecision(agentConfig, marketAnalysis, newsAnalysis, portfolioAnalysis, logger) {
  logger.info('Generating trading decision');
  
  // Popular symbols to choose from
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'];
  
  // Select symbol based on agent preferences
  let selectedSymbol;
  if (agentConfig.riskTolerance === 'low') {
    selectedSymbol = ['AAPL', 'MSFT', 'GOOGL'][Math.floor(Math.random() * 3)];
  } else if (agentConfig.riskTolerance === 'high') {
    selectedSymbol = ['TSLA', 'NVDA', 'META'][Math.floor(Math.random() * 3)];
  } else {
    selectedSymbol = symbols[Math.floor(Math.random() * symbols.length)];
  }
  
  // Calculate decision factors
  const marketFactor = marketAnalysis.score * 0.4;
  const newsFactor = newsAnalysis.score * 0.4;
  const portfolioFactor = portfolioAnalysis.canTrade ? 0.2 : -0.5;
  
  const totalScore = marketFactor + newsFactor + portfolioFactor;
  
  // Determine action based on agent personality and total score
  let action, confidence, reasoning;
  
  switch (agentConfig.riskTolerance) {
    case 'low': // Conservative agent
      if (totalScore > 0.3 && portfolioAnalysis.canTrade) {
        action = 'buy';
        confidence = Math.min(0.9, 0.6 + totalScore * 0.3);
        reasoning = `Conservative analysis: Strong positive signals (${totalScore.toFixed(2)}) with adequate cash reserves. Low-risk entry recommended.`;
      } else if (totalScore < -0.4) {
        action = 'sell';
        confidence = Math.min(0.85, 0.6 + Math.abs(totalScore) * 0.25);
        reasoning = `Conservative analysis: Significant negative signals (${totalScore.toFixed(2)}). Risk reduction recommended.`;
      } else {
        action = 'hold';
        confidence = 0.7;
        reasoning = 'Conservative analysis: Mixed signals detected. Maintaining current positions for stability.';
      }
      break;
      
    case 'high': // Aggressive agent
      if (totalScore > 0.1 && portfolioAnalysis.canTrade) {
        action = 'buy';
        confidence = Math.min(0.95, 0.5 + totalScore * 0.4);
        reasoning = `Aggressive analysis: Positive momentum detected (${totalScore.toFixed(2)}). Capitalizing on opportunity.`;
      } else if (totalScore < -0.2) {
        action = 'sell';
        confidence = Math.min(0.9, 0.5 + Math.abs(totalScore) * 0.4);
        reasoning = `Aggressive analysis: Negative trend identified (${totalScore.toFixed(2)}). Quick exit strategy.`;
      } else {
        action = 'hold';
        confidence = 0.6;
        reasoning = 'Aggressive analysis: Waiting for clearer directional signals before taking position.';
      }
      break;
      
    default: // Data-driven agent
      if (totalScore > 0.2 && portfolioAnalysis.canTrade) {
        action = 'buy';
        confidence = Math.min(0.88, 0.65 + totalScore * 0.25);
        reasoning = `Data-driven analysis: Quantitative signals favor long position (${totalScore.toFixed(2)}). Risk-adjusted entry.`;
      } else if (totalScore < -0.3) {
        action = 'sell';
        confidence = Math.min(0.85, 0.65 + Math.abs(totalScore) * 0.2);
        reasoning = `Data-driven analysis: Technical indicators suggest exit (${totalScore.toFixed(2)}). Portfolio rebalancing.`;
      } else {
        action = 'hold';
        confidence = 0.75;
        reasoning = 'Data-driven analysis: Current market conditions do not meet entry/exit criteria. Maintaining positions.';
      }
  }
  
  // Ensure confidence meets minimum threshold
  if (confidence < agentConfig.minConfidence) {
    action = 'hold';
    reasoning += ` Confidence ${confidence.toFixed(2)} below threshold ${agentConfig.minConfidence}.`;
  }
  
  return {
    agentId: agentConfig.name,
    symbol: selectedSymbol,
    action,
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
    riskLevel: agentConfig.riskTolerance,
    factors: {
      marketScore: Math.round(marketAnalysis.score * 100) / 100,
      newsScore: Math.round(newsAnalysis.score * 100) / 100,
      portfolioScore: Math.round(portfolioFactor * 100) / 100,
      totalScore: Math.round(totalScore * 100) / 100
    },
    marketConditions: {
      trend: marketAnalysis.trend,
      volatility: marketAnalysis.volatility,
      sentiment: newsAnalysis.overallSentiment
    }
  };
}

// Helper functions for market analysis
function determineTrend(marketData) {
  // Simplified trend analysis
  if (marketData.change > 0.02) return 'bullish';
  if (marketData.change < -0.02) return 'bearish';
  return 'neutral';
}

function calculateVolatility(marketData) {
  // Simplified volatility calculation
  const volatility = Math.abs(marketData.changePercent || 0);
  if (volatility > 3) return 'high';
  if (volatility > 1) return 'medium';
  return 'low';
}

function analyzeVolume(marketData) {
  // Simplified volume analysis
  return marketData.volume > 1000000 ? 'high' : 'normal';
}