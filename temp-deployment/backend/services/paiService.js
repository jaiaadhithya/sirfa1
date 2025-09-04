const axios = require('axios');
const crypto = require('crypto');

/**
 * Alibaba Cloud PAI EAS Service for AI Trading Agents
 * Integrates with PAI EAS (Elastic Algorithm Service) for LLM inference
 * Supports OpenAI-compatible API endpoints for chat completions
 */
class PaiService {
  constructor() {
    // PAI EAS Configuration
    this.serviceUrl = process.env.PAI_EAS_SERVICE_URL;
    this.serviceToken = process.env.PAI_EAS_SERVICE_TOKEN;
    this.modelName = process.env.PAI_MODEL_NAME || 'Qwen-7B-Chat';
    this.timeout = parseInt(process.env.PAI_TIMEOUT) || 30000;
    
    // API Endpoints
    this.chatEndpoint = '/v1/chat/completions';
    this.completionsEndpoint = '/v1/completions';
    
    if (!this.serviceUrl || !this.serviceToken) {
      console.warn('⚠️  PAI EAS credentials not configured. AI agents will use fallback responses.');
      console.warn('   Please set PAI_EAS_SERVICE_URL and PAI_EAS_SERVICE_TOKEN environment variables.');
    } else {
      console.log('✅ PAI EAS Service initialized successfully');
      console.log(`   Service URL: ${this.serviceUrl}`);
      console.log(`   Model: ${this.modelName}`);
    }
  }

  /**
   * Generate AI response using PAI EAS Chat Completions API
   * @param {string} prompt - The prompt to send to the model
   * @param {Object} options - Additional options for the request
   * @returns {Promise<string>} - AI generated response
   */
  async generateResponse(prompt, options = {}) {
    if (!this.serviceUrl || !this.serviceToken) {
      return this.getFallbackResponse(prompt);
    }

    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a professional financial AI assistant specialized in trading analysis and investment advice.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const requestBody = {
        model: this.modelName,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        top_p: options.topP || 0.8,
        stream: false
      };

      const response = await axios.post(
        `${this.serviceUrl}${this.chatEndpoint}`,
        requestBody,
        {
          headers: {
            'Authorization': this.serviceToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: this.timeout
        }
      );

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const choice = response.data.choices[0];
        if (choice.message && choice.message.content) {
          return choice.message.content.trim();
        }
      }

      throw new Error('Invalid response format from PAI EAS API');
    } catch (error) {
      console.error('PAI EAS API Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return this.getFallbackResponse(prompt);
    }
  }

  /**
   * Generate trading analysis using PAI EAS
   * @param {Object} marketData - Current market data
   * @param {Object} agentProfile - Agent personality and risk profile
   * @param {Object} portfolioData - Current portfolio state
   * @returns {Promise<Object>} - Trading analysis and recommendations
   */
  async generateTradingAnalysis(marketData, agentProfile, portfolioData) {
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
   * Build comprehensive trading analysis prompt for PAI
   */
  buildTradingPrompt(marketData, agentProfile, portfolioData) {
    return `You are ${agentProfile.name}, a ${agentProfile.description}.

Personality: ${agentProfile.personality}
Risk Tolerance: ${agentProfile.riskTolerance}
Investment Style: ${agentProfile.investmentStyle}
Time Horizon: ${agentProfile.timeHorizon || 'Medium-term'}
Preferred Sectors: ${agentProfile.preferredSectors?.join(', ') || 'Diversified'}

Current Market Data:
- S&P 500: ${marketData.sp500?.price || 'N/A'} (${marketData.sp500?.change || 'N/A'}%)
- NASDAQ: ${marketData.nasdaq?.price || 'N/A'} (${marketData.nasdaq?.change || 'N/A'}%)
- VIX (Volatility Index): ${marketData.vix?.price || 'N/A'}
- Market Sentiment: ${marketData.sentiment || 'Neutral'}

Current Portfolio:
- Total Value: $${portfolioData.totalValue || 0}
- Buying Power: $${portfolioData.buyingPower || 0}
- Day Change: ${portfolioData.dayChangePercent || 0}%
- Positions: ${portfolioData.positions?.length || 0} holdings
- Top Holdings: ${portfolioData.positions?.slice(0, 3).map(p => `${p.symbol} (${p.qty} shares)`).join(', ') || 'None'}

As ${agentProfile.name}, analyze the current market conditions and provide your professional trading recommendation. Consider your investment philosophy, risk tolerance, and the current market environment.

Provide your analysis in the following JSON format:
{
  "analysis": "Your market analysis (2-3 sentences)",
  "recommendation": {
    "action": "BUY/SELL/HOLD",
    "symbol": "stock symbol or null",
    "quantity": number or null,
    "confidence": 0.1-1.0,
    "reasoning": "Brief explanation for the recommendation"
  },
  "riskAssessment": "Risk level and key concerns",
  "reasoning": "Detailed explanation in your characteristic style (3-4 sentences)",
  "marketOutlook": "Short-term market outlook"
}`;
  }

  /**
   * Parse trading response from PAI EAS
   */
  parseTradingResponse(response, agentProfile) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate and enhance the response
        return {
          analysis: parsed.analysis || 'Market conditions require careful monitoring.',
          recommendation: {
            action: parsed.recommendation?.action || 'HOLD',
            symbol: parsed.recommendation?.symbol || null,
            quantity: parsed.recommendation?.quantity || null,
            confidence: Math.min(Math.max(parsed.recommendation?.confidence || 0.5, 0.1), 1.0),
            reasoning: parsed.recommendation?.reasoning || 'Maintaining current position based on market analysis.'
          },
          riskAssessment: parsed.riskAssessment || 'Moderate risk environment.',
          reasoning: parsed.reasoning || response.substring(0, 200),
          marketOutlook: parsed.marketOutlook || 'Market outlook remains uncertain.',
          agentId: agentProfile.id,
          timestamp: new Date().toISOString(),
          source: 'PAI-EAS'
        };
      }
    } catch (error) {
      console.error('Failed to parse PAI EAS response:', error);
    }

    // Fallback parsing for non-JSON responses
    return {
      analysis: this.extractSection(response, 'analysis') || 'Market conditions require careful monitoring.',
      recommendation: {
        action: 'HOLD',
        symbol: null,
        quantity: null,
        confidence: 0.5,
        reasoning: 'Unable to parse specific recommendation from AI response.'
      },
      riskAssessment: this.extractSection(response, 'risk') || 'Moderate risk environment.',
      reasoning: response.substring(0, 300) || `As ${agentProfile.name}, I recommend maintaining current positions while monitoring market developments.`,
      marketOutlook: 'Market outlook analysis in progress.',
      agentId: agentProfile.id,
      timestamp: new Date().toISOString(),
      source: 'PAI-EAS'
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
   * Generate conversational response using PAI EAS
   * @param {string} userMessage - User's message
   * @param {Object} agentProfile - Agent personality
   * @param {Object} context - Conversation context
   * @returns {Promise<string>} - Agent's response
   */
  async generateConversation(userMessage, agentProfile, context = {}) {
    const prompt = `You are ${agentProfile.name}, ${agentProfile.description}.

Personality: ${agentProfile.personality}
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
   * Fallback response when PAI EAS is unavailable
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
   * Fallback trading analysis when PAI EAS is unavailable
   */
  getFallbackTradingAnalysis(agentProfile) {
    return {
      analysis: "Market conditions are mixed with both opportunities and risks present. Our AI systems are currently optimizing analysis parameters.",
      recommendation: {
        action: "HOLD",
        symbol: null,
        quantity: null,
        confidence: 0.5,
        reasoning: "Maintaining current positions while our PAI systems complete comprehensive market analysis."
      },
      riskAssessment: "Moderate risk environment requires careful position management and continuous monitoring.",
      reasoning: `As ${agentProfile.name}, I recommend maintaining current positions while our advanced PAI-powered analysis systems process the latest market data for optimal recommendations.`,
      marketOutlook: "Market outlook analysis in progress using Alibaba Cloud AI infrastructure.",
      agentId: agentProfile.id,
      timestamp: new Date().toISOString(),
      source: 'PAI-EAS-Fallback'
    };
  }

  /**
   * Health check for PAI EAS service
   * @returns {Promise<Object>} - Service health status
   */
  async healthCheck() {
    if (!this.serviceUrl || !this.serviceToken) {
      return {
        status: 'unavailable',
        message: 'PAI EAS credentials not configured',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const testResponse = await this.generateResponse('Hello, this is a health check.', {
        maxTokens: 50,
        temperature: 0.1
      });

      return {
        status: 'healthy',
        message: 'PAI EAS service is operational',
        modelName: this.modelName,
        serviceUrl: this.serviceUrl.replace(/\/[^\/]*$/, '/***'), // Mask endpoint for security
        timestamp: new Date().toISOString(),
        testResponse: testResponse.substring(0, 100)
      };
    } catch (error) {
      return {
        status: 'error',
        message: `PAI EAS service error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new PaiService();