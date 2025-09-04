const axios = require('axios');
const crypto = require('crypto');
const paiService = require('./paiService');
const ModelStudioService = require('./modelStudioService');

/**
 * AI Service for generating trading analysis and conversations
 * Primary: Alibaba Cloud Model Studio (DashScope)
 * Fallback: PAI EAS, then legacy QWEN DashScope API
 */
class QwenService {
  constructor() {
    // Initialize Model Studio service (primary)
    this.modelStudio = new ModelStudioService();
    this.useModelStudio = process.env.DASHSCOPE_API_KEY;
    
    // PAI EAS fallback configuration
    this.usePAI = process.env.PAI_EAS_SERVICE_URL && process.env.PAI_EAS_SERVICE_TOKEN;
    
    // Legacy DashScope fallback configuration
    this.endpoint = process.env.QWEN_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    this.apiKey = process.env.QWEN_API_KEY;
    this.model = process.env.QWEN_MODEL || 'qwen-turbo';
    
    if (this.useModelStudio) {
      console.log('✅ AI Service initialized with Model Studio (primary)');
    } else if (this.usePAI) {
      console.log('✅ AI Service initialized with PAI EAS (fallback)');
    } else if (this.apiKey) {
      console.log('✅ AI Service initialized with legacy QWEN DashScope (fallback)');
    } else {
      console.warn('⚠️  No AI service configured. Features will use mock responses.');
    }
  }

  /**
   * Generate AI response using Model Studio (primary), PAI EAS (fallback), or legacy QWEN DashScope
   * @param {string} prompt - The prompt to send to AI service
   * @param {Object} options - Additional options for the request
   * @returns {Promise<string>} - AI generated response
   */
  async generateResponse(prompt, options = {}) {
    // Try Model Studio first
    if (this.useModelStudio) {
      try {
        const result = await this.modelStudio.generateConversation(prompt, [], options);
        if (result.success) {
          return result.content;
        } else {
          console.warn('Model Studio failed, trying PAI EAS fallback:', result.error);
        }
      } catch (error) {
        console.warn('Model Studio failed, trying PAI EAS fallback:', error.message);
      }
    }

    // Try PAI EAS as fallback
    if (this.usePAI) {
      try {
        return await paiService.generateResponse(prompt, options);
      } catch (error) {
        console.warn('PAI EAS failed, falling back to legacy DashScope:', error.message);
        // Continue to legacy DashScope fallback
      }
    }

    // Fallback to legacy QWEN DashScope
    if (!this.apiKey) {
      return this.getFallbackResponse(prompt);
    }

    try {
      const requestBody = {
        model: this.model,
        input: {
          messages: [
            {
              role: 'system',
              content: 'You are a professional financial AI assistant specialized in trading analysis and investment advice.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        parameters: {
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
          top_p: options.topP || 0.8
        }
      };

      const response = await axios.post(this.endpoint, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'disable'
        },
        timeout: 30000
      });

      if (response.data && response.data.output && response.data.output.choices) {
        const choice = response.data.output.choices[0];
        if (choice && choice.message && choice.message.content) {
          return choice.message.content.trim();
        }
      }

      throw new Error('Invalid response format from QWEN API');
    } catch (error) {
      console.error('QWEN DashScope API Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return this.getFallbackResponse(prompt);
    }
  }

  /**
   * Generate trading analysis using Model Studio (primary), PAI EAS (fallback), or legacy DashScope
   * @param {Object} marketData - Current market data
   * @param {Object} agentProfile - Agent personality and risk profile
   * @param {Object} portfolioData - Current portfolio state
   * @returns {Promise<Object>} - Trading analysis and recommendations
   */
  async generateTradingAnalysis(marketData, agentProfile, portfolioData) {
    // Try Model Studio first for enhanced trading analysis
    if (this.useModelStudio) {
      try {
        const result = await this.modelStudio.generateTradingAnalysis(marketData, agentProfile);
        if (result.success) {
          return {
            analysis: result.analysis,
            recommendation: {
              action: "HOLD",
              symbol: null,
              quantity: null,
              confidence: 0.7
            },
            riskAssessment: "Market analysis completed using Model Studio",
            reasoning: result.analysis,
            agentId: agentProfile.id,
            timestamp: result.timestamp
          };
        } else {
          console.warn('Model Studio trading analysis failed, trying PAI EAS:', result.error);
        }
      } catch (error) {
        console.warn('Model Studio trading analysis failed, trying PAI EAS:', error.message);
      }
    }

    // Try PAI EAS as fallback for enhanced trading analysis
    if (this.usePAI) {
      try {
        return await paiService.generateTradingAnalysis(marketData, agentProfile, portfolioData);
      } catch (error) {
        console.warn('PAI EAS trading analysis failed, using legacy DashScope fallback:', error.message);
        // Continue to legacy DashScope fallback
      }
    }

    // Fallback to legacy DashScope-based analysis
    const prompt = this.buildTradingPrompt(marketData, agentProfile, portfolioData);
    
    try {
      const response = await this.generateResponse(prompt, {
        temperature: agentProfile.creativity || 0.7,
        maxTokens: 1500,
        topP: 0.9
      });

      return this.parseTradingResponse(response, agentProfile);
    } catch (error) {
      console.error('Trading analysis error:', error);
      return this.getFallbackTradingAnalysis(agentProfile);
    }
  }

  /**
   * Build trading analysis prompt
   */
  buildTradingPrompt(marketData, agentProfile, portfolioData) {
    return `You are ${agentProfile.name}, a ${agentProfile.description}.

Personality: ${agentProfile.personality}
Risk Tolerance: ${agentProfile.riskTolerance}
Investment Style: ${agentProfile.investmentStyle}

Current Market Data:
- S&P 500: ${marketData.sp500?.price || 'N/A'} (${marketData.sp500?.change || 'N/A'}%)
- NASDAQ: ${marketData.nasdaq?.price || 'N/A'} (${marketData.nasdaq?.change || 'N/A'}%)
- VIX: ${marketData.vix?.price || 'N/A'}

Current Portfolio:
- Total Value: $${portfolioData.totalValue || 0}
- Buying Power: $${portfolioData.buyingPower || 0}
- Day Change: ${portfolioData.dayChangePercent || 0}%
- Positions: ${portfolioData.positions?.length || 0} holdings

Based on your investment philosophy and the current market conditions, provide:
1. Market Analysis (2-3 sentences)
2. Trading Recommendation (BUY/SELL/HOLD with specific symbols)
3. Risk Assessment
4. Reasoning (explain your decision in your characteristic style)

Format your response as JSON:
{
  "analysis": "your market analysis",
  "recommendation": {
    "action": "BUY/SELL/HOLD",
    "symbol": "stock symbol or null",
    "quantity": number or null,
    "confidence": 0.1-1.0
  },
  "riskAssessment": "risk level and concerns",
  "reasoning": "your explanation in character"
}`;
  }

  /**
   * Parse trading response from QWEN
   */
  parseTradingResponse(response, agentProfile) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          agentId: agentProfile.id,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Failed to parse QWEN response:', error);
    }

    // Fallback parsing
    return {
      analysis: this.extractSection(response, 'analysis') || 'Market conditions require careful monitoring.',
      recommendation: {
        action: 'HOLD',
        symbol: null,
        quantity: null,
        confidence: 0.5
      },
      riskAssessment: this.extractSection(response, 'risk') || 'Moderate risk environment.',
      reasoning: this.extractSection(response, 'reasoning') || response.substring(0, 200),
      agentId: agentProfile.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract section from text response
   */
  extractSection(text, section) {
    const patterns = {
      analysis: /(?:analysis|market)[:\s]([^\n]+)/i,
      risk: /(?:risk|assessment)[:\s]([^\n]+)/i,
      reasoning: /(?:reasoning|explanation)[:\s]([^\n]+)/i
    };

    const match = text.match(patterns[section]);
    return match ? match[1].trim() : null;
  }

  /**
   * Fallback response when AI services are unavailable
   */
  getFallbackResponse(prompt) {
    const responses = [
      "I'm currently analyzing the market conditions using advanced AI models. Please check back in a moment for detailed insights.",
      "Market analysis is in progress with our PAI-powered systems. I'll have comprehensive recommendations shortly.",
      "I'm processing the latest market data through our Alibaba Cloud AI infrastructure to provide you with the best advice."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Fallback trading analysis
   */
  getFallbackTradingAnalysis(agentProfile) {
    return {
      analysis: "Market conditions are mixed with both opportunities and risks present.",
      recommendation: {
        action: "HOLD",
        symbol: null,
        quantity: null,
        confidence: 0.5
      },
      riskAssessment: "Moderate risk environment requires careful position management.",
      reasoning: `As ${agentProfile.name}, I recommend maintaining current positions while monitoring for better entry points.`,
      agentId: agentProfile.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check for AI services (Model Studio + PAI EAS + DashScope)
   * @returns {Promise<Object>} - Combined health status
   */
  async healthCheck() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      services: {}
    };

    // Check Model Studio health
    if (this.useModelStudio) {
      try {
        const result = await this.modelStudio.healthCheck();
        healthStatus.services.modelStudio = {
          status: result.success ? 'healthy' : 'error',
          message: result.success ? 'Model Studio service operational' : result.error,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        healthStatus.services.modelStudio = {
          status: 'error',
          message: `Model Studio health check failed: ${error.message}`,
          timestamp: new Date().toISOString()
        };
      }
    } else {
      healthStatus.services.modelStudio = {
        status: 'unavailable',
        message: 'Model Studio not configured',
        timestamp: new Date().toISOString()
      };
    }

    // Check PAI EAS health
    if (this.usePAI) {
      try {
        healthStatus.services.pai = await paiService.healthCheck();
      } catch (error) {
        healthStatus.services.pai = {
          status: 'error',
          message: `PAI EAS health check failed: ${error.message}`,
          timestamp: new Date().toISOString()
        };
      }
    } else {
      healthStatus.services.pai = {
        status: 'unavailable',
        message: 'PAI EAS not configured',
        timestamp: new Date().toISOString()
      };
    }

    // Check DashScope health
    if (this.apiKey) {
      try {
        const testResponse = await this.generateResponse('Health check test', {
          maxTokens: 50,
          temperature: 0.1
        });
        healthStatus.services.dashscope = {
          status: 'healthy',
          message: 'DashScope service operational',
          model: this.model,
          endpoint: this.endpoint,
          timestamp: new Date().toISOString(),
          testResponse: testResponse.substring(0, 100)
        };
      } catch (error) {
        healthStatus.services.dashscope = {
          status: 'error',
          message: `DashScope error: ${error.message}`,
          timestamp: new Date().toISOString()
        };
      }
    } else {
      healthStatus.services.dashscope = {
        status: 'unavailable',
        message: 'DashScope API key not configured',
        timestamp: new Date().toISOString()
      };
    }

    // Determine overall status
    const modelStudioHealthy = healthStatus.services.modelStudio.status === 'healthy';
    const paiHealthy = healthStatus.services.pai.status === 'healthy';
    const dashscopeHealthy = healthStatus.services.dashscope.status === 'healthy';
    
    if (modelStudioHealthy) {
      healthStatus.overall = 'healthy';
      healthStatus.primary = 'Model Studio';
    } else if (paiHealthy) {
      healthStatus.overall = 'degraded';
      healthStatus.primary = 'PAI EAS (fallback)';
    } else if (dashscopeHealthy) {
      healthStatus.overall = 'degraded';
      healthStatus.primary = 'DashScope (fallback)';
    } else {
      healthStatus.overall = 'unavailable';
      healthStatus.primary = 'Mock responses only';
    }

    return healthStatus;
  }

  /**
   * Generate portfolio-aware conversational response with trade suggestions
   * @param {string} userMessage - User's message
   * @param {Object} agentProfile - Agent personality
   * @param {Object} context - Conversation context with portfolio data
   * @returns {Promise<Object>} - Agent's response with potential trade suggestions
   */
  async generatePortfolioAwareConversation(userMessage, agentProfile, context = {}) {
    // Build comprehensive portfolio context
    const portfolioContext = this.buildPortfolioContext(context.portfolioData);
    
    // Check if user is asking for trading advice
    const isTradingQuery = this.detectTradingIntent(userMessage);
    
    // Create enhanced prompt with portfolio awareness and trade suggestion capability
    const enhancedPrompt = this.buildPortfolioAwarePrompt(userMessage, agentProfile, portfolioContext, context, isTradingQuery);
    
    let response;
    
    // Try Model Studio first for enhanced conversation
    if (this.useModelStudio) {
      try {
        const messages = [
          {
            role: 'system',
            content: `You are ${agentProfile.name}, ${agentProfile.description}. You have access to the user's complete portfolio data and should provide personalized advice based on their actual holdings, performance, and risk profile. ${isTradingQuery ? 'The user is asking for trading advice - provide specific trade suggestions when appropriate.' : ''}`
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ];
        
        const result = await this.modelStudio.generateConversation(enhancedPrompt, messages, agentProfile);
        if (result.success) {
          response = result.content;
        } else {
          console.warn('Model Studio portfolio conversation failed, trying PAI EAS:', result.error);
        }
      } catch (error) {
        console.warn('Model Studio portfolio conversation failed, trying PAI EAS:', error.message);
      }
    }

    // Try PAI EAS as fallback
    if (!response && this.usePAI) {
      try {
        response = await paiService.generateConversation(enhancedPrompt, agentProfile, context);
      } catch (error) {
        console.warn('PAI EAS portfolio conversation failed, using legacy DashScope fallback:', error.message);
      }
    }

    // Fallback to legacy DashScope with enhanced prompt
    if (!response) {
      response = await this.generateResponse(enhancedPrompt, { temperature: 0.8, maxTokens: 800 });
    }

    // If this is a trading query, try to extract trade suggestions from the response
    if (isTradingQuery) {
      const tradeSuggestions = this.extractTradeSuggestions(response, agentProfile, context.portfolioData);
      return {
        response,
        tradeSuggestions
      };
    }

    return { response, tradeSuggestions: [] };
  }

  /**
   * Build portfolio context string for AI prompts
   * @param {Object} portfolioData - Comprehensive portfolio data
   * @returns {string} - Formatted portfolio context
   */
  buildPortfolioContext(portfolioData) {
    if (!portfolioData || portfolioData.totalValue === 0) {
      return "Portfolio: No active positions or portfolio data unavailable.";
    }

    let context = `\n=== PORTFOLIO OVERVIEW ===\n`;
    context += `Total Value: $${portfolioData.totalValue.toLocaleString()}\n`;
    context += `Available Cash: $${portfolioData.buyingPower.toLocaleString()} (${portfolioData.cashPercentage.toFixed(1)}%)\n`;
    context += `Day Change: $${portfolioData.dayChange.toLocaleString()} (${portfolioData.dayChangePercent.toFixed(2)}%)\n`;
    context += `Total Unrealized P/L: $${portfolioData.totalUnrealizedPL.toLocaleString()}\n`;
    
    if (portfolioData.positions && portfolioData.positions.length > 0) {
      context += `\n=== CURRENT POSITIONS (${portfolioData.positionCount} total) ===\n`;
      portfolioData.positions.forEach((pos, index) => {
        context += `${index + 1}. ${pos.symbol}: ${pos.quantity} shares @ $${pos.averageCost.toFixed(2)} avg cost\n`;
        context += `   Current Value: $${pos.currentValue.toLocaleString()} (${pos.percentOfPortfolio.toFixed(1)}% of portfolio)\n`;
        context += `   P/L: $${pos.unrealizedPL.toLocaleString()} (${pos.unrealizedPLPercent.toFixed(2)}%)\n`;
      });
    }
    
    if (portfolioData.topGainers && portfolioData.topGainers.length > 0) {
      context += `\n=== TOP GAINERS ===\n`;
      portfolioData.topGainers.forEach(pos => {
        context += `${pos.symbol}: +$${pos.unrealizedPL.toLocaleString()} (+${pos.unrealizedPLPercent.toFixed(2)}%)\n`;
      });
    }
    
    if (portfolioData.topLosers && portfolioData.topLosers.length > 0) {
      context += `\n=== TOP LOSERS ===\n`;
      portfolioData.topLosers.forEach(pos => {
        context += `${pos.symbol}: $${pos.unrealizedPL.toLocaleString()} (${pos.unrealizedPLPercent.toFixed(2)}%)\n`;
      });
    }
    
    if (portfolioData.sectorAllocation && portfolioData.sectorAllocation.length > 0) {
      context += `\n=== SECTOR ALLOCATION ===\n`;
      portfolioData.sectorAllocation.forEach(sector => {
        context += `${sector.sector}: ${sector.percentage.toFixed(1)}% ($${sector.value.toLocaleString()})\n`;
      });
    }
    
    context += `\n=== RISK METRICS ===\n`;
    context += `Concentration Risk: ${portfolioData.riskMetrics.concentrationRisk.toFixed(1)}% (largest position)\n`;
    context += `Diversification Score: ${portfolioData.riskMetrics.diversificationScore}/100\n`;
    context += `Cash Ratio: ${portfolioData.riskMetrics.cashRatio.toFixed(1)}%\n`;
    
    return context;
  }

  /**
   * Build portfolio-aware prompt
   * @param {string} userMessage - User's message
   * @param {Object} agentProfile - Agent personality
   * @param {string} portfolioContext - Formatted portfolio context
   * @param {Object} context - Additional context
   * @param {boolean} isTradingQuery - Whether this is a trading-related query
   * @returns {string} - Enhanced prompt
   */
  buildPortfolioAwarePrompt(userMessage, agentProfile, portfolioContext, context, isTradingQuery = false) {
    let prompt = `You are ${agentProfile.name}, ${agentProfile.description}.\n\n`;
    prompt += `Personality: ${agentProfile.personality}\n`;
    prompt += `Investment Style: ${agentProfile.investmentStyle}\n`;
    prompt += `Risk Tolerance: ${agentProfile.riskTolerance}\n\n`;
    
    prompt += `IMPORTANT: You have access to the user's complete portfolio data below. Use this information to provide personalized, specific advice based on their actual holdings, performance, and risk profile.\n`;
    prompt += portfolioContext;
    
    if (context.recentMessages && context.recentMessages.length > 0) {
      prompt += `\n=== RECENT CONVERSATION ===\n`;
      context.recentMessages.forEach(msg => {
        prompt += `User: ${msg.userMessage}\n`;
        prompt += `You: ${msg.agentResponse}\n`;
      });
    }
    
    prompt += `\n=== CURRENT USER MESSAGE ===\n`;
    prompt += `User: "${userMessage}"\n\n`;
    
    if (isTradingQuery) {
      prompt += `TRADING ADVICE REQUEST: The user is asking for trading advice. Based on their portfolio and your investment philosophy, provide specific trade recommendations if appropriate. Include:\n`;
      prompt += `- Specific stock symbols to consider\n`;
      prompt += `- Whether to BUY, SELL, or HOLD\n`;
      prompt += `- Suggested quantities based on their portfolio size and risk tolerance\n`;
      prompt += `- Clear reasoning for each recommendation\n\n`;
    }
    
    prompt += `Respond as ${agentProfile.name} with specific, actionable advice based on the user's actual portfolio. Reference specific positions, performance, and risk metrics when relevant. Keep your response conversational but professional, and always remind users that this is not personalized financial advice.`;
    
    return prompt;
  }

  /**
   * Generate conversational response using Model Studio (primary), PAI EAS (fallback), or QWEN DashScope (fallback)
   * @param {string} userMessage - User's message
   * @param {Object} agentProfile - Agent personality
   * @param {Object} context - Conversation context
   * @returns {Promise<string>} - Agent's response
   */
  async generateConversation(userMessage, agentProfile, context = {}) {
    // Try Model Studio first for enhanced conversation
    if (this.useModelStudio) {
      try {
        const result = await this.modelStudio.generateConversation(userMessage, [], agentProfile);
        if (result.success) {
          return result.content;
        } else {
          console.warn('Model Studio conversation failed, trying PAI EAS:', result.error);
        }
      } catch (error) {
        console.warn('Model Studio conversation failed, trying PAI EAS:', error.message);
      }
    }

    // Try PAI EAS as fallback for enhanced conversation
    if (this.usePAI) {
      try {
        return await paiService.generateConversation(userMessage, agentProfile, context);
      } catch (error) {
        console.warn('PAI EAS conversation failed, using legacy DashScope fallback:', error.message);
        // Continue to legacy DashScope fallback
      }
    }

    // Fallback to legacy DashScope-based conversation
    const prompt = `You are ${agentProfile.name}, ${agentProfile.description}.\n\nPersonality: ${agentProfile.personality}
Speaking Style: ${agentProfile.speakingStyle || 'Professional but approachable'}
Expertise: ${agentProfile.investmentStyle} investing with ${agentProfile.riskTolerance} risk tolerance

User says: "${userMessage}"

Context: ${JSON.stringify(context, null, 2)}

Respond in character as ${agentProfile.name}. Keep it conversational, helpful, and true to your investment philosophy and personality. Provide practical financial advice when appropriate, but always remind users that this is not personalized financial advice and they should consult with a qualified financial advisor for their specific situation.`;

    return await this.generateResponse(prompt, {
      temperature: 0.8,
      maxTokens: 500,
      topP: 0.9
    });
  }

  /**
   * Detect if user message is asking for trading advice
   * @param {string} userMessage - User's message
   * @returns {boolean} - Whether this is a trading query
   */
  detectTradingIntent(userMessage) {
    const tradingKeywords = [
      'buy', 'sell', 'trade', 'invest', 'purchase', 'recommend', 'suggestion',
      'should i', 'what do you think about', 'advice', 'portfolio', 'stock',
      'position', 'allocation', 'rebalance', 'diversify', 'opportunity'
    ];
    
    const message = userMessage.toLowerCase();
    return tradingKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Extract trade suggestions from AI response
   * @param {string} response - AI response text
   * @param {Object} agentProfile - Agent profile
   * @param {Object} portfolioData - Portfolio data
   * @returns {Array} - Array of trade suggestions
   */
  extractTradeSuggestions(response, agentProfile, portfolioData) {
    const suggestions = [];
    
    console.log('Extracting trade suggestions from response...');
    
    // Define common dividend stocks and their mappings
    const stockMentions = {
      'johnson': 'JNJ',
      'jnj': 'JNJ',
      'coca cola': 'KO',
      'coca-cola': 'KO',
      'ko': 'KO',
      'procter': 'PG',
      'gamble': 'PG',
      'pg': 'PG',
      'microsoft': 'MSFT',
      'msft': 'MSFT',
      'apple': 'AAPL',
      'aapl': 'AAPL',
      'dividend': ['JNJ', 'KO', 'PG'],
      'utility': ['NEE', 'D', 'SO'],
      'tech': ['AAPL', 'MSFT', 'GOOGL']
    };
    
    const responseText = response.toLowerCase();
    const portfolioValue = portfolioData?.totalValue || 100000;
    const suggestedAmount = Math.min(portfolioValue * 0.05, 5000);
    const baseQuantity = Math.floor(suggestedAmount / 100) || 10;
    
    // Check for specific stock mentions
    Object.keys(stockMentions).forEach(keyword => {
      if (responseText.includes(keyword)) {
        const symbols = Array.isArray(stockMentions[keyword]) ? stockMentions[keyword] : [stockMentions[keyword]];
        symbols.forEach(symbol => {
          if (!suggestions.find(s => s.symbol === symbol)) {
            suggestions.push({
               action: 'buy',
               symbol: symbol,
               quantity: baseQuantity.toString(),
               reasoning: `${agentProfile.name} recommends ${symbol} based on your investment criteria`,
               confidence: 0.8,
               agentId: agentProfile.id
             });
             console.log(`Added suggestion: BUY ${symbol} x${baseQuantity}`);
          }
        });
      }
    });
    
    // If no specific mentions found, provide default dividend recommendations
    if (suggestions.length === 0 && (responseText.includes('dividend') || responseText.includes('income') || responseText.includes('stable'))) {
      const defaultDividendStocks = ['JNJ', 'KO', 'PG'];
      defaultDividendStocks.forEach(symbol => {
         suggestions.push({
           action: 'buy',
           symbol: symbol,
           quantity: baseQuantity.toString(),
           reasoning: `${agentProfile.name} recommends ${symbol} as a quality dividend stock`,
           confidence: 0.7,
           agentId: agentProfile.id
         });
         console.log(`Added default suggestion: BUY ${symbol} x${baseQuantity}`);
       });
    }
    
    // Limit to 3 suggestions
    return suggestions.slice(0, 3);
  }
}

module.exports = new QwenService();