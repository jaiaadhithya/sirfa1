const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import route handlers from backend
const portfolioRoutes = require('../backend/routes/portfolio');
const newsRoutes = require('../backend/routes/news');
const tradingRoutes = require('../backend/routes/trading');
const agentRoutes = require('../backend/routes/agent');
const aiAgentsRoutes = require('../backend/routes/agents');
const chartsRoutes = require('../backend/routes/charts');
const alertsRoutes = require('../backend/routes/alerts');
const healthRoutes = require('../backend/routes/health');
const voiceRoutes = require('../backend/routes/voice');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/agents', aiAgentsRoutes);
app.use('/api/charts', chartsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/voice', voiceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export for Vercel
module.exports = app;