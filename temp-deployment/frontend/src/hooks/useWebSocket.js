// SIRFA Agent Finance - WebSocket React Hook
// Custom hook for managing WebSocket connections and real-time updates

import { useState, useEffect, useCallback, useRef } from 'react';
import wsClient from '../utils/websocket';

/**
 * Custom hook for WebSocket connection management
 */
export const useWebSocket = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const handlersRef = useRef(new Map());

  useEffect(() => {
    const updateConnectionStatus = () => {
      const status = wsClient.getStatus();
      if (status.isConnected) {
        setConnectionStatus('connected');
        setError(null);
      } else if (status.isReconnecting) {
        setConnectionStatus('reconnecting');
      } else {
        setConnectionStatus('disconnected');
      }
    };

    // Initial status check
    updateConnectionStatus();

    // Set up periodic status checks
    const statusInterval = setInterval(updateConnectionStatus, 1000);

    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  const sendMessage = useCallback((message) => {
    try {
      return wsClient.send(message);
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const subscribe = useCallback((channels) => {
    return wsClient.subscribe(channels);
  }, []);

  const unsubscribe = useCallback((channels) => {
    return wsClient.unsubscribe(channels);
  }, []);

  return {
    connectionStatus,
    lastMessage,
    error,
    sendMessage,
    subscribe,
    unsubscribe,
    isConnected: connectionStatus === 'connected'
  };
};

/**
 * Hook for subscribing to specific WebSocket message types
 */
export const useWebSocketSubscription = (messageType, handler, dependencies = []) => {
  const handlerRef = useRef(handler);
  
  // Update handler ref when dependencies change
  useEffect(() => {
    handlerRef.current = handler;
  }, dependencies);

  useEffect(() => {
    const wrappedHandler = (data) => {
      if (handlerRef.current) {
        handlerRef.current(data);
      }
    };

    wsClient.on(messageType, wrappedHandler);

    return () => {
      wsClient.off(messageType, wrappedHandler);
    };
  }, [messageType]);
};

/**
 * Hook for real-time portfolio updates
 */
export const usePortfolioUpdates = (onUpdate) => {
  const [portfolioData, setPortfolioData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useWebSocketSubscription('portfolio_update', (data) => {
    setPortfolioData(data);
    setLastUpdate(new Date());
    if (onUpdate) {
      onUpdate(data);
    }
  }, [onUpdate]);

  useEffect(() => {
    wsClient.subscribe(['portfolio']);
    return () => {
      wsClient.unsubscribe(['portfolio']);
    };
  }, []);

  return { portfolioData, lastUpdate };
};

/**
 * Hook for real-time trading decisions
 */
export const useTradingDecisions = (onDecision) => {
  const [decisions, setDecisions] = useState([]);
  const [lastDecision, setLastDecision] = useState(null);

  useWebSocketSubscription('trading_decision', (data) => {
    setLastDecision(data);
    setDecisions(prev => [data, ...prev.slice(0, 49)]); // Keep last 50 decisions
    if (onDecision) {
      onDecision(data);
    }
  }, [onDecision]);

  useEffect(() => {
    wsClient.subscribe(['trading']);
    return () => {
      wsClient.unsubscribe(['trading']);
    };
  }, []);

  return { decisions, lastDecision };
};

/**
 * Hook for real-time market data
 */
export const useMarketData = (onUpdate) => {
  const [marketData, setMarketData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useWebSocketSubscription('market_data', (data) => {
    setMarketData(data);
    setLastUpdate(new Date());
    if (onUpdate) {
      onUpdate(data);
    }
  }, [onUpdate]);

  useEffect(() => {
    wsClient.subscribe(['market']);
    return () => {
      wsClient.unsubscribe(['market']);
    };
  }, []);

  return { marketData, lastUpdate };
};

/**
 * Hook for real-time news updates
 */
export const useNewsUpdates = (onUpdate) => {
  const [newsData, setNewsData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  useWebSocketSubscription('news_update', (data) => {
    setNewsData(prev => {
      // Add new news items and keep only the latest 100
      const newItems = Array.isArray(data) ? data : [data];
      return [...newItems, ...prev].slice(0, 100);
    });
    setLastUpdate(new Date());
    if (onUpdate) {
      onUpdate(data);
    }
  }, [onUpdate]);

  useEffect(() => {
    wsClient.subscribe(['news']);
    return () => {
      wsClient.unsubscribe(['news']);
    };
  }, []);

  return { newsData, lastUpdate };
};

/**
 * Hook for system alerts
 */
export const useSystemAlerts = (onAlert) => {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useWebSocketSubscription('alert', (data) => {
    const alert = {
      ...data,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    
    setAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts
    setUnreadCount(prev => prev + 1);
    
    if (onAlert) {
      onAlert(alert);
    }
  }, [onAlert]);

  const markAsRead = useCallback((alertId) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, read: true } : alert
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setUnreadCount(0);
  }, []);

  return {
    alerts,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAlerts
  };
};

/**
 * Hook for sending trading actions
 */
export const useTradingActions = () => {
  const [pendingActions, setPendingActions] = useState(new Map());
  const { sendMessage } = useWebSocket();

  // Listen for trading action confirmations
  useWebSocketSubscription('trading_action_received', (data) => {
    setPendingActions(prev => {
      const updated = new Map(prev);
      if (data.actionId && updated.has(data.actionId)) {
        updated.set(data.actionId, {
          ...updated.get(data.actionId),
          status: data.status,
          receivedAt: new Date()
        });
      }
      return updated;
    });
  });

  const sendTradingAction = useCallback((action) => {
    const actionId = action.actionId || Date.now().toString();
    const actionData = {
      ...action,
      actionId,
      sentAt: new Date()
    };

    // Track pending action
    setPendingActions(prev => new Map(prev).set(actionId, {
      ...actionData,
      status: 'pending'
    }));

    // Send action
    const success = wsClient.sendTradingAction(actionData);
    
    if (!success) {
      // Remove from pending if send failed
      setPendingActions(prev => {
        const updated = new Map(prev);
        updated.delete(actionId);
        return updated;
      });
    }

    return { actionId, success };
  }, []);

  const getPendingActions = useCallback(() => {
    return Array.from(pendingActions.values());
  }, [pendingActions]);

  const clearPendingAction = useCallback((actionId) => {
    setPendingActions(prev => {
      const updated = new Map(prev);
      updated.delete(actionId);
      return updated;
    });
  }, []);

  return {
    sendTradingAction,
    pendingActions: getPendingActions(),
    clearPendingAction
  };
};

/**
 * Hook for WebSocket connection status with reconnection controls
 */
export const useWebSocketStatus = () => {
  const [status, setStatus] = useState(wsClient.getStatus());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = wsClient.getStatus();
      setStatus(currentStatus);
      setReconnectAttempts(currentStatus.reconnectAttempts);
    };

    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const forceReconnect = useCallback(() => {
    wsClient.disconnect();
    setTimeout(() => {
      wsClient.connect().catch(error => {
        console.error('Manual reconnection failed:', error);
      });
    }, 1000);
  }, []);

  return {
    ...status,
    reconnectAttempts,
    forceReconnect
  };
};