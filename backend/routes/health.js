const express = require('express');
const router = express.Router();
const qwenService = require('../services/qwenService');
const paiService = require('../services/paiService');

/**
 * Health Check Routes for AI Services
 * Monitors PAI EAS and DashScope service status
 */

/**
 * GET /api/health/ai
 * Comprehensive AI services health check
 */
router.get('/ai', async (req, res) => {
  try {
    const healthStatus = await qwenService.healthCheck();
    
    // Set appropriate HTTP status based on health
    let httpStatus = 200;
    if (healthStatus.overall === 'degraded') {
      httpStatus = 206; // Partial Content - some services down
    } else if (healthStatus.overall === 'unavailable') {
      httpStatus = 503; // Service Unavailable
    }
    
    res.status(httpStatus).json({
      success: true,
      data: healthStatus,
      message: `AI services status: ${healthStatus.overall}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/pai
 * PAI EAS specific health check
 */
router.get('/pai', async (req, res) => {
  try {
    const paiHealth = await paiService.healthCheck();
    
    let httpStatus = 200;
    if (paiHealth.status === 'error') {
      httpStatus = 503;
    } else if (paiHealth.status === 'unavailable') {
      httpStatus = 404;
    }
    
    res.status(httpStatus).json({
      success: true,
      data: paiHealth,
      message: `PAI EAS status: ${paiHealth.status}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PAI health check error:', error);
    res.status(500).json({
      success: false,
      error: 'PAI health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/health/test-ai
 * Test AI response generation
 */
router.post('/test-ai', async (req, res) => {
  try {
    const { prompt = 'Hello, this is a test message for AI health check.' } = req.body;
    
    const startTime = Date.now();
    const response = await qwenService.generateResponse(prompt, {
      maxTokens: 100,
      temperature: 0.5
    });
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        prompt,
        response,
        responseTime: `${responseTime}ms`,
        service: process.env.PAI_EAS_SERVICE_URL ? 'PAI EAS' : 'DashScope',
        timestamp: new Date().toISOString()
      },
      message: 'AI test completed successfully'
    });
  } catch (error) {
    console.error('AI test error:', error);
    res.status(500).json({
      success: false,
      error: 'AI test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/health/test-trading-analysis
 * Test trading analysis generation
 */
router.post('/test-trading-analysis', async (req, res) => {
  try {
    // Mock data for testing
    const mockMarketData = {
      sp500: { price: 4500, change: 0.5 },
      nasdaq: { price: 15000, change: -0.2 },
      vix: { price: 18.5 },
      sentiment: 'Neutral'
    };
    
    const mockAgentProfile = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'AI Trading Assistant for Testing',
      personality: 'Analytical and cautious',
      riskTolerance: 'Moderate',
      investmentStyle: 'Value investing',
      creativity: 0.7
    };
    
    const mockPortfolioData = {
      totalValue: 100000,
      buyingPower: 25000,
      dayChangePercent: 1.2,
      positions: [
        { symbol: 'AAPL', qty: 50 },
        { symbol: 'GOOGL', qty: 25 }
      ]
    };
    
    const startTime = Date.now();
    const analysis = await qwenService.generateTradingAnalysis(
      mockMarketData,
      mockAgentProfile,
      mockPortfolioData
    );
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        analysis,
        responseTime: `${responseTime}ms`,
        service: analysis.source || 'Unknown',
        testData: {
          marketData: mockMarketData,
          agentProfile: mockAgentProfile,
          portfolioData: mockPortfolioData
        },
        timestamp: new Date().toISOString()
      },
      message: 'Trading analysis test completed successfully'
    });
  } catch (error) {
    console.error('Trading analysis test error:', error);
    res.status(500).json({
      success: false,
      error: 'Trading analysis test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/system
 * Overall system health including backend services
 */
router.get('/system', async (req, res) => {
  try {
    const systemHealth = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      services: {
        backend: 'healthy',
        database: 'not_implemented', // Placeholder for future DB health check
        alpaca: process.env.ALPACA_API_KEY ? 'configured' : 'not_configured',
        pai: process.env.PAI_EAS_SERVICE_URL ? 'configured' : 'not_configured',
        dashscope: process.env.QWEN_API_KEY ? 'configured' : 'not_configured'
      }
    };
    
    // Get AI services health
    try {
      const aiHealth = await qwenService.healthCheck();
      systemHealth.ai = aiHealth;
    } catch (error) {
      systemHealth.ai = {
        status: 'error',
        message: error.message
      };
    }
    
    res.json({
      success: true,
      data: systemHealth,
      message: 'System health check completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('System health check error:', error);
    res.status(500).json({
      success: false,
      error: 'System health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;