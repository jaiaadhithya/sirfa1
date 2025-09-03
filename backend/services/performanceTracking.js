// SIRFA Agent Finance - Performance Tracking Service
// Tracks and analyzes AI agent trading performance

const fs = require('fs').promises;
const path = require('path');
const { getAgentProfile } = require('../config/agentProfiles');

class PerformanceTrackingService {
  constructor() {
    this.performanceData = new Map();
    this.dataFilePath = path.join(__dirname, '..', 'data', 'agent-performance.json');
    this.loadPerformanceData();
  }

  /**
   * Load performance data from file
   */
  async loadPerformanceData() {
    try {
      const dataDir = path.dirname(this.dataFilePath);
      await fs.mkdir(dataDir, { recursive: true });
      
      const data = await fs.readFile(this.dataFilePath, 'utf8');
      const parsedData = JSON.parse(data);
      
      // Convert object back to Map
      this.performanceData = new Map(Object.entries(parsedData));
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      console.log('Starting with fresh performance data');
      this.performanceData = new Map();
    }
  }

  /**
   * Save performance data to file
   */
  async savePerformanceData() {
    try {
      const dataDir = path.dirname(this.dataFilePath);
      await fs.mkdir(dataDir, { recursive: true });
      
      // Convert Map to object for JSON serialization
      const dataObject = Object.fromEntries(this.performanceData);
      await fs.writeFile(this.dataFilePath, JSON.stringify(dataObject, null, 2));
    } catch (error) {
      console.error('Failed to save performance data:', error);
    }
  }

  /**
   * Record a trading decision made by an agent
   */
  async recordTradingDecision(agentId, decision, portfolioData, sessionId = null) {
    try {
      const timestamp = new Date().toISOString();
      const agent = getAgentProfile(agentId);
      
      if (!this.performanceData.has(agentId)) {
        this.performanceData.set(agentId, {
          agentName: agent?.name || agentId,
          totalDecisions: 0,
          successfulTrades: 0,
          failedTrades: 0,
          totalReturn: 0,
          totalRisk: 0,
          decisions: [],
          dailyPerformance: {},
          monthlyPerformance: {},
          riskMetrics: {
            sharpeRatio: 0,
            maxDrawdown: 0,
            volatility: 0,
            winRate: 0
          },
          createdAt: timestamp
        });
      }

      const agentData = this.performanceData.get(agentId);
      const decisionRecord = {
        id: `${agentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        sessionId,
        decision: {
          action: decision.action,
          symbol: decision.symbol,
          quantity: decision.quantity,
          price: decision.price,
          reasoning: decision.reasoning
        },
        portfolioSnapshot: {
          totalValue: portfolioData.totalValue,
          dayChange: portfolioData.dayChange,
          buyingPower: portfolioData.buyingPower
        },
        outcome: null, // Will be updated when trade is executed
        performance: null // Will be calculated after execution
      };

      agentData.decisions.push(decisionRecord);
      agentData.totalDecisions++;
      agentData.updatedAt = timestamp;

      // Update daily performance tracking
      const dateKey = timestamp.split('T')[0];
      if (!agentData.dailyPerformance[dateKey]) {
        agentData.dailyPerformance[dateKey] = {
          decisions: 0,
          trades: 0,
          return: 0,
          risk: 0
        };
      }
      agentData.dailyPerformance[dateKey].decisions++;

      await this.savePerformanceData();
      return decisionRecord.id;

    } catch (error) {
      console.error('Failed to record trading decision:', error);
      return null;
    }
  }

  /**
   * Update the outcome of a trading decision
   */
  async updateTradingOutcome(agentId, decisionId, outcome) {
    try {
      const agentData = this.performanceData.get(agentId);
      if (!agentData) return false;

      const decision = agentData.decisions.find(d => d.id === decisionId);
      if (!decision) return false;

      decision.outcome = {
        executed: outcome.executed,
        executionPrice: outcome.executionPrice,
        executionTime: outcome.executionTime,
        fees: outcome.fees || 0,
        error: outcome.error || null
      };

      // Calculate performance if trade was executed
      if (outcome.executed) {
        const performance = this.calculateTradePerformance(decision, outcome);
        decision.performance = performance;
        
        // Update agent statistics
        if (performance.profitLoss > 0) {
          agentData.successfulTrades++;
        } else if (performance.profitLoss < 0) {
          agentData.failedTrades++;
        }
        
        agentData.totalReturn += performance.profitLoss;
        agentData.totalRisk += performance.risk;
        
        // Update daily performance
        const dateKey = decision.timestamp.split('T')[0];
        if (agentData.dailyPerformance[dateKey]) {
          agentData.dailyPerformance[dateKey].trades++;
          agentData.dailyPerformance[dateKey].return += performance.profitLoss;
          agentData.dailyPerformance[dateKey].risk += performance.risk;
        }
        
        // Recalculate risk metrics
        this.updateRiskMetrics(agentId);
      }

      agentData.updatedAt = new Date().toISOString();
      await this.savePerformanceData();
      return true;

    } catch (error) {
      console.error('Failed to update trading outcome:', error);
      return false;
    }
  }

  /**
   * Calculate performance metrics for a single trade
   */
  calculateTradePerformance(decision, outcome) {
    const entryPrice = decision.decision.price;
    const exitPrice = outcome.executionPrice;
    const quantity = decision.decision.quantity;
    const fees = outcome.fees || 0;
    
    let profitLoss = 0;
    if (decision.decision.action === 'BUY') {
      // For buy orders, we'll need to track when they're sold
      // For now, assume immediate paper profit/loss based on current market
      profitLoss = (exitPrice - entryPrice) * quantity - fees;
    } else if (decision.decision.action === 'SELL') {
      profitLoss = (exitPrice - entryPrice) * quantity - fees;
    }
    
    const investedAmount = entryPrice * quantity;
    const returnPercentage = investedAmount > 0 ? (profitLoss / investedAmount) * 100 : 0;
    const risk = Math.abs(profitLoss) / investedAmount * 100;
    
    return {
      profitLoss,
      returnPercentage,
      risk,
      investedAmount,
      fees,
      holdingPeriod: outcome.executionTime ? 
        new Date(outcome.executionTime) - new Date(decision.timestamp) : 0
    };
  }

  /**
   * Update risk metrics for an agent
   */
  updateRiskMetrics(agentId) {
    const agentData = this.performanceData.get(agentId);
    if (!agentData) return;

    const executedTrades = agentData.decisions.filter(d => d.outcome?.executed && d.performance);
    if (executedTrades.length === 0) return;

    const returns = executedTrades.map(d => d.performance.returnPercentage);
    const winningTrades = returns.filter(r => r > 0).length;
    
    // Calculate basic metrics
    agentData.riskMetrics.winRate = (winningTrades / executedTrades.length) * 100;
    
    // Calculate volatility (standard deviation of returns)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    agentData.riskMetrics.volatility = Math.sqrt(variance);
    
    // Calculate Sharpe ratio (assuming risk-free rate of 2%)
    const riskFreeRate = 2;
    agentData.riskMetrics.sharpeRatio = agentData.riskMetrics.volatility > 0 ? 
      (avgReturn - riskFreeRate) / agentData.riskMetrics.volatility : 0;
    
    // Calculate maximum drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningReturn = 0;
    
    for (const trade of executedTrades) {
      runningReturn += trade.performance.returnPercentage;
      if (runningReturn > peak) {
        peak = runningReturn;
      }
      const drawdown = peak - runningReturn;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    agentData.riskMetrics.maxDrawdown = maxDrawdown;
  }

  /**
   * Get performance analytics for an agent
   */
  getAgentPerformance(agentId, timeframe = 'all') {
    const agentData = this.performanceData.get(agentId);
    if (!agentData) return null;

    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }

    const filteredDecisions = agentData.decisions.filter(d => 
      new Date(d.timestamp) >= startDate
    );

    const executedTrades = filteredDecisions.filter(d => d.outcome?.executed);
    const totalReturn = executedTrades.reduce((sum, d) => 
      sum + (d.performance?.profitLoss || 0), 0
    );

    return {
      agentId,
      agentName: agentData.agentName,
      timeframe,
      summary: {
        totalDecisions: filteredDecisions.length,
        executedTrades: executedTrades.length,
        successfulTrades: executedTrades.filter(d => d.performance?.profitLoss > 0).length,
        totalReturn,
        averageReturn: executedTrades.length > 0 ? totalReturn / executedTrades.length : 0,
        winRate: agentData.riskMetrics.winRate,
        sharpeRatio: agentData.riskMetrics.sharpeRatio,
        maxDrawdown: agentData.riskMetrics.maxDrawdown,
        volatility: agentData.riskMetrics.volatility
      },
      recentDecisions: filteredDecisions.slice(-10),
      dailyPerformance: this.getDailyPerformanceInRange(agentData, startDate, now)
    };
  }

  /**
   * Get daily performance data within a date range
   */
  getDailyPerformanceInRange(agentData, startDate, endDate) {
    const dailyData = {};
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      dailyData[dateKey] = agentData.dailyPerformance[dateKey] || {
        decisions: 0,
        trades: 0,
        return: 0,
        risk: 0
      };
      current.setDate(current.getDate() + 1);
    }
    
    return dailyData;
  }

  /**
   * Get comparative performance of all agents
   */
  getComparativePerformance(timeframe = '30d') {
    const agents = Array.from(this.performanceData.keys());
    const comparison = agents.map(agentId => {
      const performance = this.getAgentPerformance(agentId, timeframe);
      return {
        agentId,
        agentName: performance.agentName,
        totalReturn: performance.summary.totalReturn,
        winRate: performance.summary.winRate,
        sharpeRatio: performance.summary.sharpeRatio,
        totalDecisions: performance.summary.totalDecisions,
        executedTrades: performance.summary.executedTrades
      };
    });

    // Sort by total return descending
    comparison.sort((a, b) => b.totalReturn - a.totalReturn);
    
    return {
      timeframe,
      agents: comparison,
      summary: {
        totalAgents: agents.length,
        totalDecisions: comparison.reduce((sum, a) => sum + a.totalDecisions, 0),
        totalTrades: comparison.reduce((sum, a) => sum + a.executedTrades, 0),
        averageReturn: comparison.length > 0 ? 
          comparison.reduce((sum, a) => sum + a.totalReturn, 0) / comparison.length : 0
      }
    };
  }

  /**
   * Get performance leaderboard
   */
  getLeaderboard(metric = 'totalReturn', timeframe = '30d') {
    const comparative = this.getComparativePerformance(timeframe);
    
    let sortedAgents;
    switch (metric) {
      case 'winRate':
        sortedAgents = comparative.agents.sort((a, b) => b.winRate - a.winRate);
        break;
      case 'sharpeRatio':
        sortedAgents = comparative.agents.sort((a, b) => b.sharpeRatio - a.sharpeRatio);
        break;
      case 'totalDecisions':
        sortedAgents = comparative.agents.sort((a, b) => b.totalDecisions - a.totalDecisions);
        break;
      default:
        sortedAgents = comparative.agents; // Already sorted by totalReturn
    }
    
    return {
      metric,
      timeframe,
      leaderboard: sortedAgents.map((agent, index) => ({
        rank: index + 1,
        ...agent
      }))
    };
  }
}

module.exports = new PerformanceTrackingService();