# SIRFA Agent Finance 🚀

**AI-Powered Trading Platform for Alibaba Cloud UAE Hackathon 2025**

SIRFA (Smart Investment & Risk Finance Agent) is a comprehensive AI-powered trading platform that combines real-time market data, intelligent trading decisions, and advanced portfolio management.

## 🌟 Key Features

- **AI Trading Agent**: Powered by Alibaba Cloud PAI EAS with QWEN models
- **Real-time Market Data**: Live portfolio tracking and market analysis
- **News Integration**: Financial news powered by The News API
- **Paper Trading**: Safe trading environment using Alpaca Markets
- **WebSocket Communication**: Real-time updates and notifications
- **Modern UI**: React 18 + Vite with Tailwind CSS

## 📰 News Integration - The News API

We've integrated **The News API** as our primary news source, providing:

- ✅ **Global Coverage**: Over 1 million articles weekly
- ✅ **Fast Performance**: Optimized response times
- ✅ **Smart Filtering**: Automatic financial news detection
- ✅ **Free Tier**: Get started without cost
- ✅ **Reliable Service**: Dedicated news API platform

### Quick Setup

1. **Get API Key**: Sign up at [The News API](https://www.thenewsapi.com/)
2. **Configure**: Add `THE_NEWS_API_KEY=your_key` to `backend/.env`
3. **Restart**: Restart the backend server

See [THE_NEWS_API_SETUP.md](./THE_NEWS_API_SETUP.md) for detailed setup instructions.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- API keys for trading and news services

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd sirfa-agent-finance

# Install dependencies
npm install

# Setup environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Start the application
npm run dev
```

## 🏗️ Project Structure

```
sirfa-agent-finance/
├── frontend/          # React 18 + Vite frontend
├── backend/           # Node.js Express API server
├── docs/             # Documentation
└── deployment/       # Deployment configurations
```

## 🛠️ Technology Stack

### Frontend
- **React 18** with Vite for fast development
- **Tailwind CSS** for modern styling
- **Recharts** for data visualization
- **WebSocket** for real-time updates

### Backend
- **Node.js** with Express framework
- **The News API** for financial news
- **Alpaca Markets API** for paper trading
- **WebSocket** server for real-time communication
- **Alibaba Cloud PAI EAS** for AI services

### AI & Cloud Services
- **Alibaba Cloud PAI EAS** with QWEN models
- **Model Studio API** for AI trading decisions
- **Function Compute** for serverless functions

## 🌐 API Endpoints

- `GET /api/news` - Financial news from The News API
- `GET /api/portfolio` - Portfolio data and performance
- `POST /api/trading/buy` - Execute buy orders
- `POST /api/trading/sell` - Execute sell orders
- `GET /api/charts/:symbol` - Market data and charts
- `GET /api/alerts` - Trading alerts and notifications

## 📋 Environment Variables

### Required
- `THE_NEWS_API_KEY` - Primary news source
- `ALPACA_API_KEY` - Trading API access
- `ALPACA_SECRET_KEY` - Trading API secret
- `PAI_EAS_ENDPOINT` - Alibaba Cloud AI endpoint
- `PAI_EAS_TOKEN` - AI service authentication

### Optional (Legacy)
- `ALPHA_VANTAGE_API_KEY` - Fallback news source
- `FINNHUB_API_KEY` - Alternative market data
- `NEWS_API_KEY` - Legacy news service
- `POLYGON_API_KEY` - Additional market data

## 🚀 Deployment

For production deployment on Alibaba Cloud, see:
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- [THE_NEWS_API_SETUP.md](./THE_NEWS_API_SETUP.md)

## 🏆 Hackathon Features

- **AI-Powered Trading**: Intelligent buy/sell decisions
- **Real-time News**: Financial news integration
- **Portfolio Management**: Track performance and allocation
- **Risk Assessment**: AI-driven risk analysis
- **Modern UI/UX**: Responsive and intuitive design

## 📄 License

Built for Alibaba Cloud UAE Hackathon 2025

---

**🎯 Ready to revolutionize trading with AI? Get started with SIRFA today!**

For questions or support, check our documentation or deployment guides.
