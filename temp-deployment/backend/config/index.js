// SIRFA Agent Finance - Configuration Management
// Centralized configuration for all environments

const path = require('path');
const fs = require('fs');

// Load environment variables from .env files
require('dotenv').config();

// Determine environment
const NODE_ENV = process.env.NODE_ENV || 'development';

// Load environment-specific .env file if it exists
const envFile = path.join(__dirname, '..', `.env.${NODE_ENV}`);
if (fs.existsSync(envFile)) {
  require('dotenv').config({ path: envFile });
}

// Validation helper
const requireEnvVar = (name, defaultValue = null) => {
  const value = process.env[name] || defaultValue;
  if (value === null) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
};

// Parse boolean values
const parseBoolean = (value, defaultValue = false) => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return defaultValue;
};

// Parse integer values
const parseInteger = (value, defaultValue = 0) => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Configuration object
const config = {
  // Environment
  env: NODE_ENV,
  isDevelopment: NODE_ENV === 'development',
  isStaging: NODE_ENV === 'staging',
  isProduction: NODE_ENV === 'production',

  // Application
  app: {
    name: 'SIRFA Agent Finance',
    version: process.env.npm_package_version || '1.0.0',
    port: parseInteger(process.env.PORT, 3001),
    apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${parseInteger(process.env.PORT, 3001)}/api`,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  },

  // Security
  security: {
    jwtSecret: requireEnvVar('JWT_SECRET', NODE_ENV === 'development' ? 'dev-jwt-secret' : null),
    encryptionKey: requireEnvVar('ENCRYPTION_KEY', NODE_ENV === 'development' ? 'dev-encryption-key-32-characters' : null),
    sessionSecret: requireEnvVar('SESSION_SECRET', NODE_ENV === 'development' ? 'dev-session-secret' : null),
    bcryptRounds: parseInteger(process.env.BCRYPT_ROUNDS, 12)
  },

  // Database
  database: {
    host: requireEnvVar('DB_HOST', 'localhost'),
    port: parseInteger(process.env.DB_PORT, 3306),
    name: requireEnvVar('DB_NAME', 'sirfa_finance'),
    user: requireEnvVar('DB_USER', 'root'),
    password: requireEnvVar('DB_PASSWORD', ''),
    ssl: parseBoolean(process.env.DB_SSL, false),
    connectionLimit: parseInteger(process.env.DB_CONNECTION_LIMIT, 10),
    timeout: parseInteger(process.env.DB_TIMEOUT, 60000),
    charset: process.env.DB_CHARSET || 'utf8mb4'
  },

  // Alibaba Cloud (Optional - only required for AI agent features)
  alibabaCloud: {
    enabled: parseBoolean(process.env.ALIBABA_CLOUD_ENABLED, false),
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || '',
    region: process.env.ALIBABA_CLOUD_REGION || 'ap-southeast-1',
    accountId: process.env.ALIBABA_CLOUD_ACCOUNT_ID || ''
  },

  // Function Compute (Optional - only required for AI agent features)
  functionCompute: {
    enabled: parseBoolean(process.env.FC_ENABLED, false),
    endpoint: process.env.FC_ENDPOINT || '',
    serviceName: process.env.FC_SERVICE_NAME || 'sirfa-trading-service',
    functionName: process.env.FC_FUNCTION_NAME || 'trading-decision-engine',
    apiVersion: process.env.FC_API_VERSION || '2016-08-15',
    timeout: parseInteger(process.env.AI_DECISION_TIMEOUT, 30000)
  },

  // OSS (Object Storage Service)
  oss: {
    region: process.env.OSS_REGION || process.env.ALIBABA_CLOUD_REGION || 'ap-southeast-1',
    bucket: process.env.OSS_BUCKET || `sirfa-app-storage-${NODE_ENV}`,
    endpoint: process.env.OSS_ENDPOINT || 'https://oss-ap-southeast-1.aliyuncs.com',
    internalEndpoint: process.env.OSS_INTERNAL_ENDPOINT || 'https://oss-ap-southeast-1-internal.aliyuncs.com'
  },

  // Log Service
  logging: {
    project: process.env.LOG_PROJECT || `sirfa-app-logs-${NODE_ENV}`,
    store: process.env.LOG_STORE || 'app-log-store',
    level: process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug'),
    maxFiles: parseInteger(process.env.LOG_MAX_FILES, NODE_ENV === 'production' ? 30 : 7),
    maxSize: process.env.LOG_MAX_SIZE || (NODE_ENV === 'production' ? '100m' : '50m')
  },

  // Alpaca Trading
  alpaca: {
    apiKey: requireEnvVar('ALPACA_API_KEY'),
    secretKey: requireEnvVar('ALPACA_SECRET_KEY'),
    baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
    dataUrl: process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets',
    streamUrl: process.env.ALPACA_STREAM_URL || 'wss://stream.data.alpaca.markets',
    paper: !parseBoolean(process.env.FEATURE_REAL_TRADING, false)
  },

  // Yahoo Finance
  yahooFinance: {
    apiKey: process.env.YAHOO_FINANCE_API_KEY || '',
    baseUrl: process.env.YAHOO_FINANCE_BASE_URL || 'https://yfapi.net',
    rateLimit: parseInteger(process.env.YAHOO_FINANCE_RATE_LIMIT, 100)
  },

  // Redis (Optional)
  redis: {
    enabled: !!process.env.REDIS_HOST,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInteger(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInteger(process.env.REDIS_DB, 0),
    ttl: parseInteger(process.env.REDIS_TTL, 3600)
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 900000), // 15 minutes
    maxRequests: parseInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    skipSuccessfulRequests: parseBoolean(process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS, false)
  },

  // WebSocket
  websocket: {
    enabled: parseBoolean(process.env.WS_ENABLED, true),
    port: parseInteger(process.env.WS_PORT, 3002),
    heartbeatInterval: parseInteger(process.env.WS_HEARTBEAT_INTERVAL, 30000),
    maxConnections: parseInteger(process.env.WS_MAX_CONNECTIONS, NODE_ENV === 'production' ? 1000 : 100)
  },

  // Trading
  trading: {
    enabled: parseBoolean(process.env.TRADING_ENABLED, true),
    maxPositionSize: parseInteger(process.env.MAX_POSITION_SIZE, NODE_ENV === 'production' ? 10000 : 1000),
    riskManagementEnabled: parseBoolean(process.env.RISK_MANAGEMENT_ENABLED, true),
    stopLossPercentage: parseFloat(process.env.STOP_LOSS_PERCENTAGE) || (NODE_ENV === 'production' ? 5 : 3),
    takeProfitPercentage: parseFloat(process.env.TAKE_PROFIT_PERCENTAGE) || (NODE_ENV === 'production' ? 10 : 5)
  },

  // AI Agent
  ai: {
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || (NODE_ENV === 'production' ? 0.7 : 0.6),
    maxRetries: parseInteger(process.env.AI_MAX_RETRIES, NODE_ENV === 'production' ? 3 : 5),
    timeout: parseInteger(process.env.AI_DECISION_TIMEOUT, NODE_ENV === 'production' ? 30000 : 45000)
  },

  // News Feed
  news: {
    refreshInterval: parseInteger(process.env.NEWS_REFRESH_INTERVAL, NODE_ENV === 'production' ? 300000 : 180000),
    maxArticles: parseInteger(process.env.NEWS_MAX_ARTICLES, NODE_ENV === 'production' ? 100 : 50),
    sentimentEnabled: parseBoolean(process.env.NEWS_SENTIMENT_ENABLED, true)
  },

  // Portfolio
  portfolio: {
    refreshInterval: parseInteger(process.env.PORTFOLIO_REFRESH_INTERVAL, NODE_ENV === 'production' ? 30000 : 15000),
    cacheTtl: parseInteger(process.env.PORTFOLIO_CACHE_TTL, NODE_ENV === 'production' ? 60 : 30)
  },

  // Monitoring
  monitoring: {
    healthCheckInterval: parseInteger(process.env.HEALTH_CHECK_INTERVAL, 30000),
    metricsEnabled: parseBoolean(process.env.METRICS_ENABLED, true),
    metricsPort: parseInteger(process.env.METRICS_PORT, 9090)
  },

  // Performance
  performance: {
    clusterMode: parseBoolean(process.env.CLUSTER_MODE, NODE_ENV === 'production'),
    workerProcesses: parseInteger(process.env.WORKER_PROCESSES, 0), // 0 = auto
    maxMemoryUsage: parseInteger(process.env.MAX_MEMORY_USAGE, NODE_ENV === 'production' ? 512 : 256)
  },

  // Feature Flags
  features: {
    realTrading: parseBoolean(process.env.FEATURE_REAL_TRADING, false),
    advancedAnalytics: parseBoolean(process.env.FEATURE_ADVANCED_ANALYTICS, true),
    socialTrading: parseBoolean(process.env.FEATURE_SOCIAL_TRADING, NODE_ENV !== 'production'),
    mobileNotifications: parseBoolean(process.env.FEATURE_MOBILE_NOTIFICATIONS, true),
    debugMode: parseBoolean(process.env.FEATURE_DEBUG_MODE, NODE_ENV !== 'production'),
    mockData: parseBoolean(process.env.FEATURE_MOCK_DATA, NODE_ENV === 'development')
  }
};

// Validation
if (config.isProduction) {
  // Additional production validations
  if (config.security.jwtSecret === 'dev-jwt-secret') {
    throw new Error('Production environment requires a secure JWT_SECRET');
  }
  if (config.security.encryptionKey === 'dev-encryption-key-32-characters') {
    throw new Error('Production environment requires a secure ENCRYPTION_KEY');
  }
  if (config.features.realTrading && config.alpaca.paper) {
    console.warn('WARNING: Real trading is enabled but using paper trading API');
  }
}

// Export configuration
module.exports = config;

// Export individual sections for convenience
module.exports.app = config.app;
module.exports.security = config.security;
module.exports.database = config.database;
module.exports.alibabaCloud = config.alibabaCloud;
module.exports.functionCompute = config.functionCompute;
module.exports.oss = config.oss;
module.exports.logging = config.logging;
module.exports.alpaca = config.alpaca;
module.exports.yahooFinance = config.yahooFinance;
module.exports.redis = config.redis;
module.exports.rateLimit = config.rateLimit;
module.exports.websocket = config.websocket;
module.exports.trading = config.trading;
module.exports.ai = config.ai;
module.exports.news = config.news;
module.exports.portfolio = config.portfolio;
module.exports.monitoring = config.monitoring;
module.exports.performance = config.performance;
module.exports.features = config.features;