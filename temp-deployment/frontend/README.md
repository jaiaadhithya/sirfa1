# SIRFA Agent Finance - Frontend

🤖 **AI-Powered Trading Platform Frontend** - Real-time market data, automated trading decisions, and portfolio management.

## 🚀 Features

- **Real-time Trading Dashboard** - Live market data and trading decisions via WebSocket
- **Portfolio Management** - Real-time portfolio tracking with Alpaca Markets integration
- **AI Trading Agent** - Automated trading decisions powered by Alibaba Cloud AI
- **News Feed** - Real-time financial news from Yahoo Finance
- **Market Data** - Live quotes, charts, and market analysis
- **Alert System** - Real-time notifications for trading events and system status
- **Responsive Design** - Modern UI with Tailwind CSS
- **WebSocket Integration** - Real-time updates for all components

## 🛠️ Tech Stack

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context + Custom Hooks
- **Real-time**: WebSocket connections
- **HTTP Client**: Axios
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Charts**: Recharts
- **Date Handling**: date-fns
- **Code Quality**: ESLint + Prettier
- **Testing**: Vitest + Testing Library

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- Backend server running on `http://localhost:3001`
- WebSocket server running on `ws://localhost:8080`

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── AlertsPanel.jsx  # System alerts and notifications
│   │   ├── MarketData.jsx   # Real-time market data display
│   │   ├── NewsFeed.jsx     # Financial news feed
│   │   ├── Portfolio.jsx    # Portfolio management
│   │   └── TradingDashboard.jsx # Trading decisions and actions
│   ├── hooks/               # Custom React hooks
│   │   └── useWebSocket.js  # WebSocket management hooks
│   ├── utils/               # Utility functions
│   │   └── websocket.js     # WebSocket client utilities
│   ├── App.jsx              # Main application component
│   ├── main.jsx             # Application entry point
│   └── index.css            # Global styles and Tailwind CSS
├── public/                  # Static assets
├── index.html               # HTML template
├── package.json             # Dependencies and scripts
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── .eslintrc.js             # ESLint configuration
├── .prettierrc              # Prettier configuration
└── README.md                # This file
```

## 🔌 WebSocket Integration

The frontend uses WebSocket connections for real-time updates:

### Available Hooks

```javascript
import {
  useWebSocket,
  usePortfolioUpdates,
  useTradingDecisions,
  useMarketDataUpdates,
  useNewsUpdates,
  useSystemAlerts,
  useTradingActions,
  useWebSocketStatus
} from '@hooks/useWebSocket';
```

### WebSocket Events

- `portfolio_update` - Real-time portfolio changes
- `trading_decision` - AI trading recommendations
- `market_data` - Live market quotes and data
- `news_update` - Financial news updates
- `system_alert` - System notifications
- `trading_action` - Trading execution updates

## 🎨 UI Components

### Portfolio Component
- Real-time portfolio value and positions
- Day change tracking with color coding
- Buying power and cash balance
- Position details with P&L

### Trading Dashboard
- AI trading decisions display
- Manual trading action buttons
- Pending orders tracking
- Trading history

### News Feed
- Real-time financial news
- Sentiment analysis display
- Category filtering
- Search functionality

### Market Data
- Live stock quotes
- Price change indicators
- Watchlist management
- Market summary

### Alerts Panel
- System notifications
- Trading alerts
- Connection status
- Alert management (mark as read, delete)

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:8080

# Feature Flags
VITE_ENABLE_TRADING=true
VITE_ENABLE_REAL_DATA=true
VITE_ENABLE_NOTIFICATIONS=true

# Development
VITE_DEV_MODE=true
VITE_LOG_LEVEL=debug
```

### API Endpoints

The frontend connects to these backend endpoints:

- `GET /api/portfolio` - Portfolio data
- `GET /api/news` - Financial news
- `GET /api/trading/decisions` - Trading decisions
- `GET /api/market/quotes` - Market data
- `GET /api/alerts` - System alerts
- `POST /api/trading/execute` - Execute trades
- `GET /api/websocket/status` - WebSocket status

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test Portfolio.test.jsx
```

## 🚀 Deployment

### Production Build

```bash
# Build for production
npm run build

# The build artifacts will be stored in the `dist/` directory
```

### Environment Setup

For production deployment:

1. Update API URLs in environment variables
2. Configure CORS settings in backend
3. Set up HTTPS for WebSocket connections
4. Configure CDN for static assets

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔍 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if backend WebSocket server is running on port 8080
   - Verify CORS settings in backend
   - Check firewall settings

2. **API Requests Failing**
   - Ensure backend server is running on port 3001
   - Check API endpoint URLs in configuration
   - Verify CORS settings

3. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility
   - Verify all dependencies are installed

4. **Styling Issues**
   - Ensure Tailwind CSS is properly configured
   - Check PostCSS configuration
   - Verify CSS imports in main.jsx

### Debug Mode

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('debug', 'sirfa:*');
```

## 📝 Development Guidelines

### Code Style
- Use ESLint and Prettier for consistent formatting
- Follow React best practices and hooks patterns
- Use TypeScript-style JSDoc comments for better IDE support
- Implement proper error boundaries and loading states

### Component Guidelines
- Keep components focused and single-purpose
- Use custom hooks for complex state logic
- Implement proper loading and error states
- Add accessibility attributes (ARIA labels, etc.)

### Performance
- Use React.memo for expensive components
- Implement proper dependency arrays in useEffect
- Optimize WebSocket message handling
- Use code splitting for large components

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is part of the SIRFA Agent Finance platform developed for the Alibaba Cloud UAE Hackathon.

## 🆘 Support

For support and questions:
- Check the troubleshooting section above
- Review backend API documentation
- Check WebSocket connection status in browser dev tools
- Verify environment configuration

---

**Built with ❤️ by the SIRFA Team for Alibaba Cloud UAE Hackathon**