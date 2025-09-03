const axios = require('axios');

class ModelStudioService {
    constructor() {
        this.apiKey = process.env.DASHSCOPE_API_KEY;
        // Using OpenAI-compatible endpoint for DashScope (Singapore region)
        this.baseUrl = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
        this.compatibleUrl = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
        
        if (!this.apiKey) {
            console.warn('DASHSCOPE_API_KEY not found in environment variables');
        }
    }

    /**
     * Generate conversation response using OpenAI-compatible DashScope API
     * @param {string} prompt - The user prompt
     * @param {Array} messages - Chat messages array
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - API response
     */
    async generateConversation(prompt, messages = [], options = {}) {
        try {
            const requestData = {
                model: options.model || 'qwen-plus',
                messages: messages.length > 0 ? messages : [
                    {
                        role: 'system',
                        content: 'You are SIRFA, an AI-powered financial advisor specializing in trading analysis and investment strategies. Provide helpful, accurate, and professional financial guidance.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: options.maxTokens || 2000,
                temperature: options.temperature || 0.7,
                top_p: options.topP || 0.8
            };

            const response = await axios.post(this.baseUrl, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            if (response.data && response.data.choices && response.data.choices[0]) {
                return {
                    success: true,
                    content: response.data.choices[0].message.content,
                    usage: response.data.usage,
                    model: response.data.model || 'qwen-plus',
                    requestId: response.data.id
                };
            } else {
                throw new Error('Invalid response format from DashScope API');
            }
        } catch (error) {
            console.error('Model Studio API Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message,
                fallback: this.getFallbackResponse()
            };
        }
    }

    /**
     * Generate trading analysis using OpenAI-compatible endpoint
     * @param {Object} marketData - Market data for analysis
     * @param {Object} userProfile - User trading profile
     * @returns {Promise<Object>} - Trading analysis
     */
    async generateTradingAnalysis(marketData, userProfile = {}) {
        try {
            const analysisPrompt = this.buildTradingAnalysisPrompt(marketData, userProfile);
            
            const requestData = {
                model: 'qwen-plus',
                messages: [
                    {
                        role: 'system',
                        content: 'You are SIRFA, an expert AI trading analyst. Analyze market data and provide actionable trading insights with risk assessments and specific recommendations.'
                    },
                    {
                        role: 'user',
                        content: analysisPrompt
                    }
                ],
                max_tokens: 2500,
                temperature: 0.3,
                top_p: 0.9
            };

            const response = await axios.post(this.compatibleUrl, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 45000
            });

            if (response.data && response.data.choices && response.data.choices[0]) {
                const analysis = response.data.choices[0].message.content;
                return {
                    success: true,
                    analysis: analysis,
                    timestamp: new Date().toISOString(),
                    model: response.data.model,
                    usage: response.data.usage
                };
            } else {
                throw new Error('Invalid response format from Model Studio');
            }
        } catch (error) {
            console.error('Trading Analysis Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.message,
                fallback: this.getFallbackTradingAnalysis()
            };
        }
    }

    /**
     * Build trading analysis prompt
     * @param {Object} marketData - Market data
     * @param {Object} userProfile - User profile
     * @returns {string} - Formatted prompt
     */
    buildTradingAnalysisPrompt(marketData, userProfile) {
        return `
As SIRFA, analyze the following market data and provide trading recommendations:

MARKET DATA:
${JSON.stringify(marketData, null, 2)}

USER PROFILE:
- Risk Tolerance: ${userProfile.riskTolerance || 'Moderate'}
- Investment Style: ${userProfile.investmentStyle || 'Balanced'}
- Experience Level: ${userProfile.experience || 'Intermediate'}
- Portfolio Size: ${userProfile.portfolioSize || 'Not specified'}

Please provide:
1. Market trend analysis
2. Key opportunities and risks
3. Specific trading recommendations
4. Risk management strategies
5. Entry/exit points if applicable

Format your response as a comprehensive trading analysis report.
        `.trim();
    }

    /**
     * Health check for Model Studio service
     * @returns {Promise<Object>} - Health status
     */
    async healthCheck() {
        try {
            const testResponse = await this.generateConversation(
                'Hello, please respond with a brief confirmation that you are working.',
                [],
                { maxTokens: 50, temperature: 0.1 }
            );

            return {
                service: 'Model Studio (DashScope)',
                status: testResponse.success ? 'healthy' : 'unhealthy',
                model: testResponse.model || 'qwen-plus',
                endpoint: this.baseUrl,
                timestamp: new Date().toISOString(),
                testResponse: testResponse.success ? testResponse.content : testResponse.error
            };
        } catch (error) {
            return {
                service: 'Model Studio (DashScope)',
                status: 'unhealthy',
                error: error.message,
                endpoint: this.baseUrl,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get available models
     * @returns {Array} - List of available models
     */
    getAvailableModels() {
        return [
            'qwen-plus',
            'qwen-max',
            'qwen-turbo',
            'qwen-long',
            'qwen-vl-plus',
            'qwen-vl-max'
        ];
    }

    /**
     * Get fallback response for conversation
     * @returns {string} - Fallback message
     */
    getFallbackResponse() {
        return "I'm SIRFA, your AI financial advisor powered by Alibaba Cloud Model Studio. I'm currently experiencing connectivity issues, but I'm here to help with your trading and investment questions. Please try again in a moment.";
    }

    /**
     * Get fallback trading analysis
     * @returns {string} - Fallback analysis
     */
    getFallbackTradingAnalysis() {
        return `
**SIRFA Trading Analysis - Service Temporarily Unavailable**

I'm currently experiencing connectivity issues with the Model Studio service. However, here are some general trading principles to consider:

**Risk Management:**
- Never invest more than you can afford to lose
- Diversify your portfolio across different assets
- Set stop-loss orders to limit potential losses

**Market Analysis:**
- Monitor key economic indicators
- Stay informed about market news and events
- Use technical analysis alongside fundamental analysis

**Recommendations:**
- Consider dollar-cost averaging for long-term investments
- Review and rebalance your portfolio regularly
- Consult with financial professionals for personalized advice

Please try again later for detailed market analysis powered by Alibaba Cloud AI.
        `.trim();
    }
}

module.exports = ModelStudioService;