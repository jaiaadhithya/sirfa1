// Simplified App component without WebSocket dependencies
import React, { useState } from 'react';
import './App.css';
import TradingDashboard from './components/TradingDashboard';
import AIAgents from './components/AIAgents';
import { 
  BarChart3, 
  TrendingUp, 
  Newspaper, 
  Bell, 
  Wallet, 
  Activity,
  Menu,
  Bot
} from 'lucide-react';

function SimpleApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Trading Dashboard', icon: BarChart3 },
    { id: 'agents', label: 'AI Agents', icon: Bot },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
    { id: 'charts', label: 'Charts', icon: TrendingUp },
    { id: 'market', label: 'Market Data', icon: Activity },
    { id: 'news', label: 'News Feed', icon: Newspaper },
    { id: 'alerts', label: 'Alerts', icon: Bell }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div style={{ padding: '2rem', color: '#e2e8f0' }}>
            <h2>Trading Dashboard</h2>
            <p>Dashboard content will be loaded here...</p>
          </div>
        );
      case 'agents':
        return (
          <div style={{ padding: '2rem', color: '#e2e8f0' }}>
            <h2>AI Agents</h2>
            <p>AI Agents content will be loaded here...</p>
          </div>
        );
      default:
        return (
          <div style={{ padding: '2rem', color: '#e2e8f0' }}>
            <h2>{activeTab}</h2>
            <p>Content for {activeTab} will be loaded here...</p>
          </div>
        );
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
          <div className="connection-status connected">
            <div className="status-indicator"></div>
            <span>Connected (Test Mode)</span>
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

export default SimpleApp;