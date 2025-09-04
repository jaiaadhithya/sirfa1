# SIRFA Agent Finance - Technical Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Environment Configuration](#environment-configuration)
6. [API Documentation](#api-documentation)
7. [Database Schema](#database-schema)
8. [Deployment Guide](#deployment-guide)
9. [Development Setup](#development-setup)
10. [Testing](#testing)
11. [Monitoring & Logging](#monitoring--logging)
12. [Security](#security)
13. [Performance Optimization](#performance-optimization)
14. [Troubleshooting](#troubleshooting)
15. [Contributing](#contributing)

## System Overview

SIRFA Agent Finance is a comprehensive financial trading and portfolio management platform that integrates AI-powered decision making with real-time market data. The system provides automated trading capabilities, portfolio analysis, and intelligent financial insights.

### Key Features

- **AI-Powered Trading Agents**: Automated trading decisions using Alibaba Cloud PAI
- **Real-time Market Data**: Integration with Alpha Vantage, Finnhub, and Polygon.io
- **Portfolio Management**: Comprehensive portfolio tracking and analysis
- **News Integration**: Financial news aggregation and sentiment analysis
- **WebSocket Communication**: Real-time updates and notifications
- **Voice Integration**: Alibaba Cloud speech services for voice commands
- **Multi-platform Deployment**: Support for Vercel, Alibaba Cloud, Docker, and more

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │  External APIs  │
│   (React/Vite)  │◄──►│   (Node.js)     │◄──►│  (Market Data)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   AI Services   │    │   Trading APIs  │
│   Server        │    │ (Alibaba PAI)   │    │   (Alpaca)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Architecture

#### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Tailwind CSS + Radix UI
- **State Management**: React Context + Custom Hooks
- **Charts**: Recharts for financial data visualization
- **WebSocket**: Native WebSocket API for real-time updates

#### Backend (Node.js + Express)
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **WebSocket**: ws library for real-time communication
- **Security**: Helmet, CORS, Rate Limiting
- **Process Management**: PM2 for production

#### AI Services
- **Primary**: Alibaba Cloud PAI EAS (Qwen models)
- **Fallback**: Direct Qwen API integration
- **Speech**: Alibaba Cloud ASR/TTS services

#### External Integrations
- **Market Data**: Alpha Vantage, Finnhub, Polygon.io
- **Trading**: Alpaca Markets API
- **News**: NewsAPI, financial news aggregation

## Technology Stack

### Frontend Technologies
```json
{
  "core": {
    "react": "^18.3.1",
    "typescript": "^5.6.2",
    "vite": "^5.4.8"
  },
  "ui": {
    "tailwindcss": "^3.4.13",
    "@radix-ui/react-*": "^1.1.x",
    "lucide-react": "^0.451.0"
  },
  "charts": {
    "recharts": "^2.12.7"
  },
  "utilities": {
    "axios": "^1.7.7",
    "date-fns": "^4.1.0",
    "uuid": "^10.0.0"
  }
}
```

### Backend Technologies
```json
{
  "core": {
    "node": ">=18.0.0",
    "express": "^4.21.1",
    "cors": "^2.8.5",
    "helmet": "^8.0.0"
  },
  "websocket": {
    "ws": "^8.18.0"
  },
  "security": {
    "express-rate-limit": "^7.4.1",
    "bcryptjs": "^2.4.3"
  },
  "utilities": {
    "axios": "^1.7.7",
    "dotenv": "^16.4.5",
    "uuid": "^10.0.0"
  }
}
```

## Project Structure

```
sirfa-agent-finance/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── App.tsx         # Main application component
│   │   └── main.tsx        # Application entry point
│   ├── public/             # Static assets
│   ├── package.json        # Frontend dependencies
│   └── vite.config.js      # Vite configuration
├── backend/                 # Node.js backend API
│   ├── routes/             # API route handlers
│   │   ├── portfolio.js    # Portfolio management
│   │   ├── trading.js      # Trading operations
│   │   ├── agents.js       # AI agent management
│   │   ├── charts.js       # Chart data endpoints
│   │   ├── news.js         # News aggregation
│   │   └── health.js       # Health check endpoints
│   ├── services/           # Business logic services
│   │   ├── aiService.js    # AI integration
│   │   ├── tradingService.js # Trading logic
│   │   └── marketDataService.js # Market data
│   ├── websocket/          # WebSocket server
│   ├── config/             # Configuration files
│   ├── server.js           # Main server file
│   └── package.json        # Backend dependencies
├── api/                     # Vercel serverless functions
│   └── [...path].js        # Catch-all API handler
├── deploy/                  # Deployment configurations
│   ├── kubernetes/         # K8s manifests
│   ├── terraform/          # Infrastructure as code
│   └── docker/             # Docker configurations
├── alibaba-functions/       # Alibaba Cloud functions
├── docs/                    # Documentation files
├── package.json            # Root package configuration
├── vercel.json             # Vercel deployment config
├── docker-compose.yml      # Docker Compose setup
└── README.md               # Project overview
```

## Environment Configuration

### Frontend Environment Variables

#### Development (.env.development)
```bash
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:8080/ws

# Feature Flags
VITE_ENABLE_TRADING=true
VITE_ENABLE_REAL_DATA=true
VITE_ENABLE_NOTIFICATIONS=true

# Development Settings
VITE_DEV_MODE=true
VITE_LOG_LEVEL=debug
```

#### Production (.env.production)
```bash
# API Configuration (Vercel)
VITE_API_URL=/api
VITE_WS_URL=wss://your-domain.vercel.app/ws

# Feature Flags
VITE_ENABLE_TRADING=true
VITE_ENABLE_REAL_DATA=true
VITE_ENABLE_NOTIFICATIONS=true

# Production Settings
VITE_DEV_MODE=false
VITE_LOG_LEVEL=error
```

### Backend Environment Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-domain.com

# Alibaba Cloud PAI Configuration
PAI_EAS_SERVICE_URL=https://your-service.eas.aliyuncs.com
PAI_EAS_SERVICE_TOKEN=your_pai_eas_service_token
PAI_MODEL_NAME=qwen-plus
PAI_TIMEOUT=30000
ALIBABA_REGION=us-east-1

# Alibaba Cloud Credentials
ALIBABA_ACCESS_KEY_ID=your_access_key_id
ALIBABA_ACCESS_KEY_SECRET=your_access_key_secret
ALIBABA_ASR_APP_KEY=your_asr_app_key
ALIBABA_TTS_APP_KEY=your_tts_app_key
DASHSCOPE_API_KEY=your_dashscope_api_key

# Trading API (Alpaca)
ALPACA_API_KEY=your_alpaca_api_key
ALPACA_SECRET_KEY=your_alpaca_secret_key
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# Market Data APIs
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
FINNHUB_API_KEY=your_finnhub_key
POLYGON_API_KEY=your_polygon_key
NEWS_API_KEY=your_news_api_key

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
CORS_ORIGIN=https://your-frontend-domain.com

# Logging
LOG_LEVEL=info
```

## API Documentation

### Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Core Endpoints

#### Portfolio Management

**GET /api/portfolio**
- Description: Retrieve user portfolio data
- Response: Portfolio summary with holdings and performance

```json
{
  "totalValue": 50000.00,
  "dayChange": 250.50,
  "dayChangePercent": 0.5,
  "holdings": [
    {
      "symbol": "AAPL",
      "quantity": 100,
      "currentPrice": 150.00,
      "totalValue": 15000.00,
      "dayChange": 50.00
    }
  ]
}
```

**POST /api/portfolio/rebalance**
- Description: Trigger portfolio rebalancing
- Body: Rebalancing parameters

#### Trading Operations

**GET /api/trading/decisions**
- Description: Get AI-generated trading decisions
- Response: List of recommended trades

```json
{
  "decisions": [
    {
      "symbol": "TSLA",
      "action": "BUY",
      "quantity": 50,
      "confidence": 0.85,
      "reasoning": "Strong technical indicators and positive sentiment"
    }
  ]
}
```

**POST /api/trading/execute**
- Description: Execute a trade order
- Body: Trade parameters

```json
{
  "symbol": "AAPL",
  "side": "buy",
  "qty": 100,
  "type": "market"
}
```

#### Market Data

**GET /api/charts/:symbol**
- Description: Get chart data for a symbol
- Parameters: symbol (stock ticker)
- Query: timeframe (1D, 1W, 1M, 3M, 1Y)

**GET /api/market/quotes/:symbol**
- Description: Get real-time quote for a symbol

#### AI Agents

**GET /api/agents**
- Description: List all AI agents and their status

**POST /api/agents/:id/start**
- Description: Start an AI agent

**POST /api/agents/:id/stop**
- Description: Stop an AI agent

#### News & Alerts

**GET /api/news**
- Description: Get financial news feed
- Query: category, limit, offset

**GET /api/alerts**
- Description: Get user alerts and notifications

#### Health Checks

**GET /api/health**
- Description: Basic health check

**GET /api/health/system**
- Description: Detailed system health

**GET /api/health/pai**
- Description: PAI service connectivity check

### WebSocket Events

The WebSocket server supports real-time communication on port 8080.

#### Client Events

**subscribe**
```json
{
  "type": "subscribe",
  "channels": ["trading", "portfolio", "market"]
}
```

**unsubscribe**
```json
{
  "type": "unsubscribe",
  "channels": ["trading"]
}
```

#### Server Events

**portfolio_update**
```json
{
  "type": "portfolio_update",
  "data": {
    "totalValue": 50250.50,
    "dayChange": 250.50
  }
}
```

**trade_executed**
```json
{
  "type": "trade_executed",
  "data": {
    "symbol": "AAPL",
    "side": "buy",
    "qty": 100,
    "price": 150.00
  }
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Portfolio Table
```sql
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  total_value DECIMAL(15,2),
  cash_balance DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Holdings Table
```sql
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES portfolios(id),
  symbol VARCHAR(10) NOT NULL,
  quantity DECIMAL(15,4),
  average_cost DECIMAL(10,2),
  current_price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Trades Table
```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES portfolios(id),
  symbol VARCHAR(10) NOT NULL,
  side VARCHAR(4) NOT NULL, -- 'buy' or 'sell'
  quantity DECIMAL(15,4),
  price DECIMAL(10,2),
  total_amount DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'pending',
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Deployment Guide

### Vercel Deployment (Recommended)

1. **Prerequisites**
   - Vercel account
   - GitHub repository
   - Environment variables configured

2. **Configuration**
   - `vercel.json` is already configured
   - Frontend builds to `frontend/dist`
   - API routes handled by serverless functions

3. **Environment Variables**
   Set in Vercel dashboard:
   ```
   NODE_ENV=production
   PAI_EAS_SERVICE_URL=...
   PAI_EAS_SERVICE_TOKEN=...
   ALPACA_API_KEY=...
   ALPHA_VANTAGE_API_KEY=...
   ```

4. **Deploy**
   ```bash
   # Connect to Vercel
   vercel login
   vercel link
   
   # Deploy
   vercel --prod
   ```

### Docker Deployment

1. **Build Images**
   ```bash
   # Build all services
   docker-compose build
   
   # Or build individually
   docker build -f Dockerfile.frontend -t sirfa-frontend .
   docker build -f backend/Dockerfile -t sirfa-backend ./backend
   ```

2. **Run with Docker Compose**
   ```bash
   # Start all services
   docker-compose up -d
   
   # Check status
   docker-compose ps
   
   # View logs
   docker-compose logs -f
   ```

### Alibaba Cloud ECS Deployment

1. **Server Setup**
   ```bash
   # Run deployment script
   chmod +x deploy-alibaba-cloud.sh
   ./deploy-alibaba-cloud.sh
   ```

2. **Manual Setup**
   ```bash
   # Install dependencies
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx pm2
   
   # Clone and setup
   git clone <repository-url>
   cd sirfa-agent-finance
   npm run install:all
   npm run build:all
   
   # Start with PM2
   pm2 start ecosystem.config.js
   pm2 startup
   pm2 save
   ```

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- Code editor (VS Code recommended)

### Local Development

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd sirfa-agent-finance
   ```

2. **Install Dependencies**
   ```bash
   # Install all dependencies
   npm run install:all
   
   # Or install individually
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment templates
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.development
   
   # Edit with your API keys
   nano backend/.env
   nano frontend/.env.development
   ```

4. **Start Development Servers**
   ```bash
   # Start both frontend and backend
   npm run start:dev
   
   # Or start individually
   cd frontend && npm run dev
   cd backend && npm run dev
   ```

5. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - WebSocket: ws://localhost:8080

### Development Scripts

```bash
# Root level scripts
npm run install:all      # Install all dependencies
npm run build:all        # Build all components
npm run start:dev        # Start development servers
npm run start:prod       # Start production servers
npm run test:all         # Run all tests
npm run lint:all         # Lint all code
npm run health-check     # Check system health

# Frontend scripts
cd frontend
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run test             # Run tests
npm run lint             # Lint code

# Backend scripts
cd backend
npm run dev              # Start with nodemon
npm start                # Start production server
npm test                 # Run tests
npm run lint             # Lint code
```

## Testing

### Frontend Testing

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test Portfolio.test.jsx
```

### Backend Testing

```bash
cd backend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run specific test suite
npm test -- --grep "Trading Service"
```

### End-to-End Testing

```bash
# Install Playwright
npx playwright install

# Run E2E tests
npm run test:e2e

# Run tests in headed mode
npm run test:e2e -- --headed
```

## Monitoring & Logging

### Application Monitoring

1. **Health Checks**
   - `/api/health` - Basic health check
   - `/api/health/system` - Detailed system status
   - `/api/health/pai` - AI service connectivity

2. **Performance Monitoring**
   - Response time tracking
   - Memory usage monitoring
   - CPU utilization alerts

3. **Error Tracking**
   - Centralized error logging
   - Error rate monitoring
   - Alert notifications

### Logging Configuration

```javascript
// Backend logging setup
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Log Analysis

```bash
# View recent logs
tail -f logs/combined.log

# Search for errors
grep "ERROR" logs/combined.log

# Monitor API requests
grep "API" logs/combined.log | tail -20
```

## Security

### Security Measures

1. **API Security**
   - JWT authentication
   - Rate limiting
   - CORS configuration
   - Helmet.js security headers
   - Input validation and sanitization

2. **Environment Security**
   - Environment variable encryption
   - Secret management
   - API key rotation
   - Secure communication (HTTPS/WSS)

3. **Data Protection**
   - Password hashing (bcrypt)
   - SQL injection prevention
   - XSS protection
   - CSRF protection

### Security Configuration

```javascript
// Express security middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);
```

## Performance Optimization

### Frontend Optimization

1. **Code Splitting**
   ```javascript
   // Lazy loading components
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   const Portfolio = lazy(() => import('./pages/Portfolio'));
   ```

2. **Asset Optimization**
   - Image compression and lazy loading
   - CSS and JS minification
   - Gzip compression
   - CDN integration

3. **Caching Strategy**
   - Browser caching headers
   - Service worker caching
   - API response caching

### Backend Optimization

1. **Database Optimization**
   - Query optimization
   - Connection pooling
   - Indexing strategy
   - Caching layer (Redis)

2. **API Optimization**
   - Response compression
   - Pagination implementation
   - Efficient data serialization
   - Background job processing

3. **Monitoring**
   ```javascript
   // Performance monitoring middleware
   app.use((req, res, next) => {
     const start = Date.now();
     res.on('finish', () => {
       const duration = Date.now() - start;
       logger.info(`${req.method} ${req.path} - ${duration}ms`);
     });
     next();
   });
   ```

## Troubleshooting

### Common Issues

#### 1. API Connection Failed

**Symptoms**: Frontend shows "Backend connection failed" errors

**Causes**:
- Incorrect API URLs in environment variables
- Backend server not running
- CORS configuration issues
- Network connectivity problems

**Solutions**:
```bash
# Check backend status
curl http://localhost:3001/api/health

# Verify environment variables
echo $VITE_API_URL

# Check CORS settings in backend
# Ensure FRONTEND_URL matches your frontend domain
```

#### 2. WebSocket Connection Issues

**Symptoms**: Real-time updates not working

**Solutions**:
```javascript
// Check WebSocket URL format
// Development: ws://localhost:8080/ws
// Production: wss://your-domain.com/ws

// Verify WebSocket server is running
netstat -an | grep 8080
```

#### 3. AI Service Errors

**Symptoms**: AI agents not responding, PAI errors

**Solutions**:
```bash
# Test PAI connectivity
curl -X POST "$PAI_EAS_SERVICE_URL" \
  -H "Authorization: Bearer $PAI_EAS_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'

# Check credentials and service URL
echo $PAI_EAS_SERVICE_URL
echo $PAI_EAS_SERVICE_TOKEN
```

#### 4. Trading API Issues

**Symptoms**: Trading operations failing

**Solutions**:
```bash
# Test Alpaca API connectivity
curl -X GET "https://paper-api.alpaca.markets/v2/account" \
  -H "APCA-API-KEY-ID: $ALPACA_API_KEY" \
  -H "APCA-API-SECRET-KEY: $ALPACA_SECRET_KEY"

# Verify API keys and permissions
# Check if using paper trading vs live trading URLs
```

#### 5. Deployment Issues

**Vercel Deployment Problems**:
```bash
# Check build logs
vercel logs

# Verify environment variables
vercel env ls

# Test local build
npm run build:all
```

**Docker Issues**:
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild containers
docker-compose build --no-cache
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Frontend debug
VITE_LOG_LEVEL=debug npm run dev

# Backend debug
LOG_LEVEL=debug npm run dev

# Enable all debug output
DEBUG=* npm run dev
```

### Performance Issues

1. **Slow API Responses**
   - Check database query performance
   - Monitor external API response times
   - Review caching implementation

2. **High Memory Usage**
   - Monitor memory leaks
   - Check for unclosed connections
   - Review data processing efficiency

3. **WebSocket Performance**
   - Monitor connection count
   - Check message queue size
   - Review event handling efficiency

## Contributing

### Development Workflow

1. **Fork and Clone**
   ```bash
   git clone <your-fork-url>
   cd sirfa-agent-finance
   git remote add upstream <original-repo-url>
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Development**
   - Follow coding standards
   - Write tests for new features
   - Update documentation
   - Test thoroughly

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Provide clear description
   - Include test results
   - Reference related issues

### Coding Standards

1. **JavaScript/TypeScript**
   - Use ESLint configuration
   - Follow Prettier formatting
   - Use meaningful variable names
   - Add JSDoc comments for functions

2. **React Components**
   - Use functional components with hooks
   - Implement proper prop types
   - Follow component naming conventions
   - Use custom hooks for logic reuse

3. **API Development**
   - Follow RESTful conventions
   - Implement proper error handling
   - Use consistent response formats
   - Add comprehensive logging

### Testing Requirements

- Unit tests for all new functions
- Integration tests for API endpoints
- Component tests for React components
- E2E tests for critical user flows
- Minimum 80% code coverage

---

## Support

For technical support or questions:

- **Documentation**: Check this technical documentation
- **Issues**: Create GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub Discussions for general questions
- **Email**: Contact the development team

---

*Last updated: January 2025*
*Version: 1.0.0*