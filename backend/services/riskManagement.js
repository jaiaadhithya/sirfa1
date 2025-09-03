// SIRFA Agent Finance - Risk Management Service
// Enforces agent-specific risk limits and position sizing

const { getAgentProfile } = require('../config/agentProfiles');
const config = require('../config');

class RiskManagementService {
  constructor() {
    this.positionLimits = {
      'wharton-buffest': {
        maxPositionSize: 0.05, // 5% of portfolio per position
        maxDailyRisk: 0.02, // 2% daily risk limit
        maxDrawdown: 0.10, // 10% maximum drawdown
        maxLeverage: 1.0, // No leverage
        sectorConcentration: 0.25, // Max 25% in any sector
        minCashReserve: 0.20 // Keep 20% cash
      },
      'melvin-arck': {
        maxPositionSize: 0.15, // 15% of portfolio per position
        maxDailyRisk: 0.08, // 8% daily risk limit
        maxDrawdown: 0.25, // 25% maximum drawdown
        maxLeverage: 2.0, // 2x leverage allowed
        sectorConcentration: 0.50, // Max 50% in any sector
        minCashReserve: 0.05 // Keep 5% cash
      },
      'jane-quant': {
        maxPositionSize: 0.10, // 10% of portfolio per position
        maxDailyRisk: 0.05, // 5% daily risk limit
        maxDrawdown: 0.15, // 15% maximum drawdown
        maxLeverage: 1.5, // 1.5x leverage allowed
        sectorConcentration: 0.60, // Max 60% in tech sector
        minCashReserve: 0.10 // Keep 10% cash
      }
    };
  }

  /**
   * Validate a trading decision against risk limits
   * @param {string} agentId - The agent making the decision
   * @param {Object} tradingDecision - The proposed trading decision
   * @param {Object} portfolioData - Current portfolio data
   * @returns {Object} Validation result with approval status and reasons
   */
  validateTradingDecision(agentId, tradingDecision, portfolioData) {
    try {
      const agent = getAgentProfile(agentId);
      const limits = this.positionLimits[agentId];
      
      if (!agent || !limits) {
        return {
          approved: false,
          reason: 'Unknown agent or missing risk limits',
          adjustedDecision: null
        };
      }

      const validationResults = [];
      let adjustedDecision = { ...tradingDecision };

      // 1. Position Size Validation
      const positionSizeCheck = this.validatePositionSize(
        tradingDecision, portfolioData, limits
      );
      if (!positionSizeCheck.valid) {
        validationResults.push(positionSizeCheck.reason);
        adjustedDecision = positionSizeCheck.adjustedDecision || adjustedDecision;
      }

      // 2. Daily Risk Validation
      const dailyRiskCheck = this.validateDailyRisk(
        tradingDecision, portfolioData, limits
      );
      if (!dailyRiskCheck.valid) {
        validationResults.push(dailyRiskCheck.reason);
        adjustedDecision = dailyRiskCheck.adjustedDecision || adjustedDecision;
      }

      // 3. Drawdown Validation
      const drawdownCheck = this.validateDrawdown(
        portfolioData, limits
      );
      if (!drawdownCheck.valid) {
        validationResults.push(drawdownCheck.reason);
        adjustedDecision.action = 'HOLD';
      }

      // 4. Cash Reserve Validation
      const cashReserveCheck = this.validateCashReserve(
        tradingDecision, portfolioData, limits
      );
      if (!cashReserveCheck.valid) {
        validationResults.push(cashReserveCheck.reason);
        adjustedDecision = cashReserveCheck.adjustedDecision || adjustedDecision;
      }

      // 5. Sector Concentration Validation
      const sectorCheck = this.validateSectorConcentration(
        tradingDecision, portfolioData, limits
      );
      if (!sectorCheck.valid) {
        validationResults.push(sectorCheck.reason);
        adjustedDecision = sectorCheck.adjustedDecision || adjustedDecision;
      }

      return {
        approved: validationResults.length === 0,
        reason: validationResults.join('; '),
        adjustedDecision: validationResults.length > 0 ? adjustedDecision : null,
        riskMetrics: this.calculateRiskMetrics(portfolioData, tradingDecision)
      };

    } catch (error) {
      console.error('Risk validation error:', error);
      return {
        approved: false,
        reason: 'Risk validation system error',
        adjustedDecision: null
      };
    }
  }

  /**
   * Validate position size against limits
   */
  validatePositionSize(tradingDecision, portfolioData, limits) {
    if (tradingDecision.action === 'SELL' || tradingDecision.action === 'HOLD') {
      return { valid: true };
    }

    const portfolioValue = portfolioData.totalValue || 100000;
    const proposedValue = tradingDecision.quantity * (tradingDecision.price || 100);
    const positionPercentage = proposedValue / portfolioValue;

    if (positionPercentage > limits.maxPositionSize) {
      const maxQuantity = Math.floor(
        (portfolioValue * limits.maxPositionSize) / (tradingDecision.price || 100)
      );
      
      return {
        valid: false,
        reason: `Position size ${(positionPercentage * 100).toFixed(1)}% exceeds limit of ${(limits.maxPositionSize * 100).toFixed(1)}%`,
        adjustedDecision: {
          ...tradingDecision,
          quantity: maxQuantity,
          reasoning: tradingDecision.reasoning + ` (Quantity adjusted for risk limits)`
        }
      };
    }

    return { valid: true };
  }

  /**
   * Validate daily risk exposure
   */
  validateDailyRisk(tradingDecision, portfolioData, limits) {
    // Simplified daily risk calculation based on volatility
    const portfolioValue = portfolioData.totalValue || 100000;
    const currentRisk = Math.abs(portfolioData.dayChange || 0) / portfolioValue;
    
    if (currentRisk > limits.maxDailyRisk) {
      return {
        valid: false,
        reason: `Daily risk ${(currentRisk * 100).toFixed(1)}% exceeds limit of ${(limits.maxDailyRisk * 100).toFixed(1)}%`,
        adjustedDecision: { ...tradingDecision, action: 'HOLD' }
      };
    }

    return { valid: true };
  }

  /**
   * Validate portfolio drawdown
   */
  validateDrawdown(portfolioData, limits) {
    // Simplified drawdown calculation
    const currentValue = portfolioData.totalValue || 100000;
    const highWaterMark = portfolioData.highWaterMark || currentValue;
    const drawdown = (highWaterMark - currentValue) / highWaterMark;

    if (drawdown > limits.maxDrawdown) {
      return {
        valid: false,
        reason: `Portfolio drawdown ${(drawdown * 100).toFixed(1)}% exceeds limit of ${(limits.maxDrawdown * 100).toFixed(1)}%`
      };
    }

    return { valid: true };
  }

  /**
   * Validate cash reserve requirements
   */
  validateCashReserve(tradingDecision, portfolioData, limits) {
    if (tradingDecision.action !== 'BUY') {
      return { valid: true };
    }

    const portfolioValue = portfolioData.totalValue || 100000;
    const currentCash = portfolioData.buyingPower || portfolioValue * 0.1;
    const proposedSpend = tradingDecision.quantity * (tradingDecision.price || 100);
    const remainingCash = currentCash - proposedSpend;
    const cashPercentage = remainingCash / portfolioValue;

    if (cashPercentage < limits.minCashReserve) {
      const maxSpend = currentCash - (portfolioValue * limits.minCashReserve);
      const maxQuantity = Math.floor(maxSpend / (tradingDecision.price || 100));
      
      if (maxQuantity <= 0) {
        return {
          valid: false,
          reason: `Insufficient cash reserves. Need to maintain ${(limits.minCashReserve * 100).toFixed(1)}% cash`,
          adjustedDecision: { ...tradingDecision, action: 'HOLD' }
        };
      }

      return {
        valid: false,
        reason: `Trade would violate cash reserve requirement of ${(limits.minCashReserve * 100).toFixed(1)}%`,
        adjustedDecision: {
          ...tradingDecision,
          quantity: maxQuantity,
          reasoning: tradingDecision.reasoning + ` (Quantity adjusted to maintain cash reserves)`
        }
      };
    }

    return { valid: true };
  }

  /**
   * Validate sector concentration limits
   */
  validateSectorConcentration(tradingDecision, portfolioData, limits) {
    // Simplified sector validation - would need real sector data
    // For now, assume tech concentration for Jane Quant
    if (tradingDecision.action !== 'BUY') {
      return { valid: true };
    }

    // This would be enhanced with real sector classification
    const isTechStock = tradingDecision.symbol && 
      ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META'].includes(tradingDecision.symbol);
    
    if (isTechStock && limits.sectorConcentration < 1.0) {
      // Simplified check - in real implementation, would calculate actual sector exposure
      return { valid: true }; // Allow for now, would implement proper sector tracking
    }

    return { valid: true };
  }

  /**
   * Calculate risk metrics for the portfolio
   */
  calculateRiskMetrics(portfolioData, tradingDecision) {
    const portfolioValue = portfolioData.totalValue || 100000;
    const dayChange = portfolioData.dayChange || 0;
    const volatility = Math.abs(dayChange) / portfolioValue;
    
    return {
      portfolioValue,
      dailyVolatility: volatility,
      cashReserve: (portfolioData.buyingPower || 0) / portfolioValue,
      dayChangePercent: (dayChange / portfolioValue) * 100,
      proposedTradeSize: tradingDecision.quantity * (tradingDecision.price || 100),
      proposedTradePercent: ((tradingDecision.quantity * (tradingDecision.price || 100)) / portfolioValue) * 100
    };
  }

  /**
   * Get risk limits for an agent
   */
  getRiskLimits(agentId) {
    return this.positionLimits[agentId] || null;
  }

  /**
   * Update risk limits for an agent (for dynamic risk management)
   */
  updateRiskLimits(agentId, newLimits) {
    if (this.positionLimits[agentId]) {
      this.positionLimits[agentId] = { ...this.positionLimits[agentId], ...newLimits };
      return true;
    }
    return false;
  }
}

module.exports = new RiskManagementService();