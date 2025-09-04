const express = require('express');
const router = express.Router();

// Sample alerts data
const generateSampleAlerts = () => {
  const currentTime = new Date();
  return [
    {
      id: 1,
      type: 'success',
      title: 'System Connected',
      message: 'Successfully connected to Alpaca Markets API',
      timestamp: new Date(currentTime.getTime() - 5 * 60000).toISOString(),
      read: false,
      priority: 'low'
    },
    {
      id: 2,
      type: 'info',
      title: 'Market Data Active',
      message: 'Real-time market data streaming from Alpha Vantage',
      timestamp: new Date(currentTime.getTime() - 10 * 60000).toISOString(),
      read: false,
      priority: 'medium'
    },
    {
      id: 3,
      type: 'warning',
      title: 'API Rate Limit',
      message: 'Approaching Alpha Vantage API rate limit (4/5 requests used)',
      timestamp: new Date(currentTime.getTime() - 15 * 60000).toISOString(),
      read: true,
      priority: 'medium'
    },
    {
      id: 4,
      type: 'success',
      title: 'Portfolio Updated',
      message: 'Portfolio data synchronized successfully',
      timestamp: new Date(currentTime.getTime() - 20 * 60000).toISOString(),
      read: true,
      priority: 'low'
    }
  ];
};

// Get all alerts
router.get('/', async (req, res) => {
  try {
    const alerts = generateSampleAlerts();
    
    res.json({
      success: true,
      data: alerts,
      meta: {
        total: alerts.length,
        unread: alerts.filter(alert => !alert.read).length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch alerts'
    });
  }
});

// Mark alert as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, you would update the database
    // For now, just return success
    res.json({
      success: true,
      message: `Alert ${id} marked as read`
    });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark alert as read'
    });
  }
});

// Delete alert
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, you would delete from the database
    // For now, just return success
    res.json({
      success: true,
      message: `Alert ${id} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete alert'
    });
  }
});

// Create new alert
router.post('/', async (req, res) => {
  try {
    const { type, title, message, priority = 'medium', alertType, condition, value } = req.body;
    
    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, title, message'
      });
    }
    
    const newAlert = {
      id: Date.now(), // Simple ID generation
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      priority,
      alertType, // Custom alert type (portfolio_drop, stock_drop, etc.)
      condition, // Stock symbol or condition
      value, // Threshold value
      active: true, // Whether the alert is actively monitoring
      triggered: false // Whether the alert has been triggered
    };
    
    // In a real implementation, you would save to the database
    // and set up monitoring for the alert condition
    
    res.status(201).json({
      success: true,
      data: newAlert,
      message: 'Custom alert created successfully and monitoring started'
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create alert'
    });
  }
});

// Get user's custom alerts
router.get('/custom', async (req, res) => {
  try {
    // In a real implementation, fetch from database
    const customAlerts = [
      {
        id: 1001,
        type: 'custom',
        title: 'Portfolio Drop Alert',
        message: 'Alert when portfolio drops by 5%',
        alertType: 'portfolio_drop',
        value: '5',
        active: true,
        triggered: false,
        timestamp: new Date().toISOString(),
        priority: 'high'
      },
      {
        id: 1002,
        type: 'custom',
        title: 'AAPL Price Alert',
        message: 'Alert when AAPL drops by 3%',
        alertType: 'stock_drop',
        condition: 'AAPL',
        value: '3',
        active: true,
        triggered: false,
        timestamp: new Date().toISOString(),
        priority: 'medium'
      }
    ];
    
    res.json({
      success: true,
      data: customAlerts,
      meta: {
        total: customAlerts.length,
        active: customAlerts.filter(alert => alert.active).length
      }
    });
  } catch (error) {
    console.error('Error fetching custom alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch custom alerts'
    });
  }
});

// Toggle alert active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, you would update the database
    res.json({
      success: true,
      message: `Alert ${id} status toggled successfully`
    });
  } catch (error) {
    console.error('Error toggling alert:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to toggle alert status'
    });
  }
});

module.exports = router;