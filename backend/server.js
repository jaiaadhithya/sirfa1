const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
require('dotenv').config();

const WebSocketServer = require('./websocket/server');
const WebSocketIntegration = require('./services/websocketIntegration');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 8081;

// Initialize WebSocket server
const wsServer = new WebSocketServer();
// Initialize WebSocket integration service
const wsIntegration = new WebSocketIntegration(wsServer);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs (increased for testing)
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import route handlers
const portfolioRoutes = require('./routes/portfolio');
const newsRoutes = require('./routes/news');
const tradingRoutes = require('./routes/trading');
const agentRoutes = require('./routes/agent');
const aiAgentsRoutes = require('./routes/agents');
const chartsRoutes = require('./routes/charts');
const alertsRoutes = require('./routes/alerts');
const healthRoutes = require('./routes/health');

// API Routes
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/agents', aiAgentsRoutes);
app.use('/api/charts', chartsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/health', healthRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// WebSocket status endpoint
app.get('/api/websocket/status', (req, res) => {
  res.json(wsServer.getStats());
});

// Start HTTP server
server.listen(PORT, () => {
  console.log(`🚀 SIRFA Agent Finance Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});

// Start WebSocket server and initialize integration
wsServer.start().then(async () => {
  console.log(`🔌 WebSocket server running on port ${config.websocket.port}`);
  
  // Connect integration service to WebSocket server
  wsServer.setIntegration(wsIntegration);
  
  // Initialize WebSocket integration
  await wsIntegration.initialize();
  
  // Make WebSocket integration available globally to avoid circular dependencies
  global.wsIntegration = wsIntegration;
  
  console.log('✅ WebSocket integration initialized');
}).catch(error => {
  console.error('Failed to start WebSocket server:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await wsIntegration.shutdown();
  await wsServer.shutdown();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await wsIntegration.shutdown();
  await wsServer.shutdown();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, wsServer };