// SIRFA Agent Finance - Alerts Panel Component
// Real-time alerts and notifications with WebSocket integration

import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, Plus, TrendingDown, DollarSign, Target } from 'lucide-react';
import { useSystemAlerts, useWebSocket } from '../hooks/useWebSocket';

const AlertsPanel = () => {
  const [localAlerts, setLocalAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [alertStats, setAlertStats] = useState({ critical: 0, warning: 0, info: 0 });
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: 'portfolio_drop',
    title: '',
    condition: '',
    value: '',
    priority: 'medium'
  });

  const { isConnected } = useWebSocket();
  const { alerts, lastUpdate } = useSystemAlerts((data) => {
    console.log('Alert received:', data);
    // Increment unread count for new alerts
    if (data.type === 'new_alert') {
      setUnreadCount(prev => prev + 1);
    }
  });

  // Fetch initial alerts
  useEffect(() => {
    const fetchInitialAlerts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/alerts');
        if (!response.ok) {
          throw new Error('Failed to fetch alerts');
        }
        const data = await response.json();
        setLocalAlerts(data.alerts || []);
        setUnreadCount(data.unreadCount || 0);
        
        // Calculate alert statistics
        const stats = (data.alerts || []).reduce((acc, alert) => {
          acc[alert.severity] = (acc[alert.severity] || 0) + 1;
          return acc;
        }, { critical: 0, warning: 0, info: 0 });
        setAlertStats(stats);
        
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialAlerts();
  }, []);

  // Use WebSocket data if available, otherwise use local data
  const displayAlerts = alerts.length > 0 ? alerts : localAlerts;

  // Filter alerts based on selected filter
  const filteredAlerts = displayAlerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !alert.read;
    return alert.type === filter;
  });

  const markAsRead = async (alertId) => {
    try {
      await fetch(`/api/alerts/${alertId}/read`, { method: 'POST' });
      setLocalAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, read: true } : alert
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking alert as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/alerts/read-all', { method: 'POST' });
      setLocalAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all alerts as read:', err);
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      await fetch(`/api/alerts/${alertId}`, { method: 'DELETE' });
      setLocalAlerts(prev => prev.filter(alert => alert.id !== alertId));
      if (!localAlerts.find(a => a.id === alertId)?.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting alert:', err);
    }
  };

  const getAlertIcon = (type, severity) => {
    const iconMap = {
      trading: '💹',
      portfolio: '📊',
      market: '📈',
      system: '⚙️',
      security: '🔒',
      news: '📰',
      ai: '🤖'
    };

    if (severity === 'critical') return '🚨';
    if (severity === 'warning') return '⚠️';
    return iconMap[type] || '🔔';
  };

  const getAlertColor = (severity, read) => {
    const baseColors = {
      critical: 'border-red-500 bg-red-50',
      warning: 'border-yellow-500 bg-yellow-50',
      info: 'border-blue-500 bg-blue-50',
      success: 'border-green-500 bg-green-50'
    };

    const readColors = {
      critical: 'border-red-200 bg-red-25',
      warning: 'border-yellow-200 bg-yellow-25',
      info: 'border-blue-200 bg-blue-25',
      success: 'border-green-200 bg-green-25'
    };

    return read ? (readColors[severity] || 'border-gray-200 bg-gray-50') : (baseColors[severity] || 'border-gray-300 bg-white');
  };

  const getSeverityTextColor = (severity) => {
    const colors = {
      critical: 'text-red-700',
      warning: 'text-yellow-700',
      info: 'text-blue-700',
      success: 'text-green-700'
    };
    return colors[severity] || 'text-gray-700';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const alertTypes = ['all', 'unread', 'trading', 'portfolio', 'market', 'system', 'security', 'news', 'ai'];

  const alertConditions = [
    { id: 'portfolio_drop', label: 'Portfolio Drop', icon: TrendingDown, description: 'Alert when portfolio value drops by percentage' },
    { id: 'stock_drop', label: 'Stock Price Drop', icon: TrendingDown, description: 'Alert when a stock price drops by percentage' },
    { id: 'stock_rise', label: 'Stock Price Rise', icon: Target, description: 'Alert when a stock price rises by percentage' },
    { id: 'portfolio_value', label: 'Portfolio Value', icon: DollarSign, description: 'Alert when portfolio reaches specific value' }
  ];

  const createAlert = async () => {
    try {
      const selectedCondition = alertConditions.find(c => c.id === newAlert.type);
      let message = '';
      
      if (newAlert.type === 'portfolio_drop') {
        message = `Alert when portfolio drops by ${newAlert.value}%`;
      } else if (newAlert.type === 'portfolio_value') {
        message = `Alert when portfolio reaches $${newAlert.value}`;
      } else if (newAlert.type === 'stock_drop') {
        message = `Alert when ${newAlert.condition} drops by ${newAlert.value}%`;
      } else if (newAlert.type === 'stock_rise') {
        message = `Alert when ${newAlert.condition} rises by ${newAlert.value}%`;
      }

      const alertData = {
        type: 'custom',
        title: newAlert.title || `${selectedCondition?.label} Alert`,
        message: message,
        priority: newAlert.priority,
        alertType: newAlert.type,
        condition: newAlert.condition,
        value: newAlert.value
      };

      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alertData)
      });

      if (response.ok) {
        setShowCreateAlert(false);
        setNewAlert({ type: 'portfolio_drop', title: '', condition: '', value: '', priority: 'medium' });
        // Refresh alerts
        fetchInitialAlerts();
      }
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-gray-200 rounded-lg p-3">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Alerts Header */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl border border-red-500/30">
              <Bell className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">System Alerts</h3>
              <p className="text-sm text-slate-400">Real-time trading and system notifications</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl text-sm font-semibold border flex items-center space-x-2 ${
            isConnected 
              ? 'bg-green-500/20 text-green-400 border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`} />
            <span>{isConnected ? 'Live Alerts' : 'Offline'}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-400">Critical</p>
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-400">{alertStats.critical}</p>
            <p className="text-xs text-slate-500 mt-1">Urgent attention required</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-400">Warning</p>
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-400">{alertStats.warning}</p>
            <p className="text-xs text-slate-500 mt-1">Monitor closely</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-400">Info</p>
              <Info className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-400">{alertStats.info}</p>
            <p className="text-xs text-slate-500 mt-1">General updates</p>
          </div>
        </div>
      </div>

      {/* Create Alert Panel */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
              <Plus className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Create Custom Alert</h3>
              <p className="text-sm text-slate-400">Set up personalized alerts for your portfolio and stocks</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateAlert(!showCreateAlert)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              showCreateAlert
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg'
            }`}
          >
            {showCreateAlert ? 'Cancel' : 'Create Alert'}
          </button>
        </div>

        {showCreateAlert && (
          <div className="space-y-6">
            {/* Alert Type Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Alert Type</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alertConditions.map((condition) => {
                  const IconComponent = condition.icon;
                  return (
                    <button
                      key={condition.id}
                      onClick={() => setNewAlert({ ...newAlert, type: condition.id })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        newAlert.type === condition.id
                          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 text-white'
                          : 'bg-slate-700/30 border-slate-600/30 text-slate-300 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <IconComponent className="h-5 w-5" />
                        <span className="font-medium">{condition.label}</span>
                      </div>
                      <p className="text-xs text-slate-400">{condition.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Alert Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Alert Title (Optional)</label>
                <input
                  type="text"
                  value={newAlert.title}
                  onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                  placeholder="Custom alert name"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                <select
                  value={newAlert.priority}
                  onChange={(e) => setNewAlert({ ...newAlert, priority: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            {/* Condition-specific inputs */}
            {(newAlert.type === 'stock_drop' || newAlert.type === 'stock_rise') && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Stock Symbol</label>
                <input
                  type="text"
                  value={newAlert.condition}
                  onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value.toUpperCase() })}
                  placeholder="e.g., AAPL, TSLA, MSFT"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {newAlert.type === 'portfolio_value' ? 'Target Value ($)' : 'Percentage Change (%)'}
              </label>
              <input
                type="number"
                value={newAlert.value}
                onChange={(e) => setNewAlert({ ...newAlert, value: e.target.value })}
                placeholder={newAlert.type === 'portfolio_value' ? '10000' : '5'}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
            </div>

            {/* Create Button */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateAlert(false)}
                className="px-6 py-3 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-600/50 transition-colors border border-slate-600/30"
              >
                Cancel
              </button>
              <button
                onClick={createAlert}
                disabled={!newAlert.value || (newAlert.type.includes('stock') && !newAlert.condition)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Alert
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alerts Panel */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50">
        {/* Header */}
        <div 
          className="flex justify-between items-center p-6 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/20 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-white">Alert Details</h2>
            {unreadCount > 0 && (
              <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {lastUpdate && (
              <span className="text-xs text-slate-400">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <button className="text-slate-400 hover:text-white transition-colors">
              {isExpanded ? '▼' : '▶'}
            </button>
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="p-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6">
                <div className="text-red-400">
                  <strong>Error:</strong> {error}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="mb-6 space-y-4">
              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                {alertTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      filter === type
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/30'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                    {type === 'unread' && unreadCount > 0 && (
                      <span className="ml-2 bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              {unreadCount > 0 && (
                <div className="flex space-x-3">
                  <button
                    onClick={markAllAsRead}
                    className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-600/50 text-sm border border-slate-600/30 transition-colors"
                  >
                    Mark All Read
                  </button>
                </div>
              )}
            </div>

            {/* Alerts List */}
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert, index) => (
                  <div 
                    key={alert.id || index} 
                    className={`bg-slate-700/30 border border-slate-600/30 rounded-xl p-4 transition-all hover:bg-slate-700/50 ${
                      !alert.read ? 'border-l-4 border-l-blue-400 shadow-lg' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-xl">
                            {getAlertIcon(alert.type, alert.severity)}
                          </span>
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            alert.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            alert.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {alert.severity?.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400 bg-slate-600/30 px-2 py-1 rounded-lg">
                            {alert.type?.toUpperCase()}
                          </span>
                          {!alert.read && (
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                          )}
                        </div>
                        
                        <h4 className={`font-semibold mb-2 ${
                          alert.read ? 'text-slate-400' : 'text-white'
                        }`}>
                          {alert.title}
                        </h4>
                        
                        <p className={`text-sm mb-3 ${
                          alert.read ? 'text-slate-500' : 'text-slate-300'
                        }`}>
                          {alert.message}
                        </p>
                        
                        {alert.data && (
                          <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-3 mb-3 border border-slate-600/30">
                            <pre className="whitespace-pre-wrap">
                              {typeof alert.data === 'string' ? alert.data : JSON.stringify(alert.data, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{formatTimestamp(alert.timestamp || alert.createdAt)}</span>
                          {alert.source && (
                            <span className="font-medium text-slate-400">{alert.source}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2 ml-4">
                        {!alert.read && (
                          <button
                            onClick={() => markAsRead(alert.id)}
                            className="text-blue-400 hover:text-blue-300 text-sm p-1 rounded transition-colors"
                            title="Mark as read"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="text-red-400 hover:text-red-300 text-sm p-1 rounded transition-colors"
                          title="Delete alert"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="text-slate-500 mb-4">
                    <Bell className="mx-auto h-16 w-16" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    {filter === 'unread' ? 'No unread alerts' : 
                     filter === 'all' ? 'No alerts' : `No ${filter} alerts`}
                  </h3>
                  <p className="text-slate-400">
                    {filter === 'all' 
                      ? 'System alerts will appear here'
                      : `No ${filter} alerts at this time`
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {filteredAlerts.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-700/50 text-center">
                <span className="text-sm text-slate-400">
                  Showing {filteredAlerts.length} of {displayAlerts.length} alerts
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;