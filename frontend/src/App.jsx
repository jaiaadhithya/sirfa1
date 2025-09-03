// SIRFA Agent Finance - Main Application Component
// Real-time trading platform with AI-powered decisions

import React, { useState, useEffect } from 'react';
import './App.css';
// import { useWebSocket, useWebSocketStatus } from './hooks/useWebSocket';
import Portfolio from './components/Portfolio';
import TradingDashboard from './components/TradingDashboard';
import MarketData from './components/MarketData';
import AlertsPanel from './components/AlertsPanel';
import Charts from './components/Charts';
import AIAgents from './components/AIAgents';
import { 
  BarChart3, 
  TrendingUp, 
  Bell, 
  Wallet, 
  Activity,
  Wifi,
  WifiOff,
  Menu,
  X,
  Bot,
  DollarSign,
  Brain,
  RefreshCw
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Mock WebSocket status for now
  const isConnected = false;
  const connectionStatus = 'disconnected';
  const reconnect = () => console.log('Reconnect clicked');
  
  // Test backend connectivity on app load
  useEffect(() => {
    console.log('🚀 App loaded - Testing backend connectivity');
    fetch('/api/trading/account')
      .then(response => {
        console.log('✅ Backend response status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('✅ Backend data received:', data);
        // Backend connection successful - removed alert popup
      })
      .catch(error => {
        console.error('❌ Backend connection failed:', error);
        // Backend connection failed - removed alert popup
      });
  }, []);

  // useEffect(() => {
  //   if (isConnected) {
  //     subscribe([
  //       'portfolio_update',
  //       'trading_decision',
  //       'market_data',
  //       'news_update',
  //       'system_alert'
  //     ]);
  //   }
  // }, [isConnected, subscribe]);

  const tabs = [
    { id: 'dashboard', label: 'Trading Dashboard', icon: BarChart3 },
    { id: 'agents', label: 'AI Agents', icon: Bot },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
    { id: 'charts', label: 'Charts', icon: TrendingUp },
    { id: 'market', label: 'Market Data', icon: Activity },
    { id: 'alerts', label: 'Alerts', icon: Bell }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'portfolio':
        return <Portfolio />;
      case 'alerts':
        return <AlertsPanel />;
      case 'dashboard':
        return <TradingDashboard />;

      case 'agents':
        return <AIAgents />;
      case 'charts':
        return <Charts />;
      case 'market':
        return <MarketData />;
      default:
        return <AIAgents />;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Menu size={20} />
          </button>
          <h1 className="app-title">
            <TrendingUp className="app-icon" />
            Sirfa
          </h1>
        </div>
        <div className="header-right">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className="status-indicator"></div>
            <span>{connectionStatus}</span>
            {!isConnected && (
              <button onClick={reconnect} className="reconnect-btn">
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="app-body">
        <nav className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-content">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
              >
                <tab.icon size={20} />
                {!sidebarCollapsed && <span>{tab.label}</span>}
              </button>
            ))}
          </div>
        </nav>

        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;