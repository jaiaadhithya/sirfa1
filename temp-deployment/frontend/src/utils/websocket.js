// SIRFA Agent Finance - WebSocket Client
// Real-time trading updates and notifications

class WebSocketClient {
  constructor(url = null) {
    this.url = url || import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8080/ws`;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.subscriptions = new Set();
    this.messageHandlers = new Map();
    this.connectionPromise = null;
    this.isReconnecting = false;
  }

  /**
   * Connect to WebSocket server
   */
  async connect() {
    if (this.isConnected || this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        console.log('Connecting to WebSocket server:', this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = (event) => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          this.startHeartbeat();
          this.resubscribeAll();
          this.connectionPromise = null;
          resolve(event);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();
          this.connectionPromise = null;
          
          if (!this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.connectionPromise = null;
          reject(error);
        };

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.isReconnecting = false;
      this.stopHeartbeat();
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else {
            console.error('Max reconnection attempts reached');
            this.isReconnecting = false;
          }
        });
      }
    }, delay);
  }

  /**
   * Handle incoming messages
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      // Handle system messages
      switch (message.type) {
        case 'connection':
          console.log('Connection confirmed:', message.data);
          break;
        case 'pong':
          // Heartbeat response
          break;
        case 'error':
          console.error('Server error:', message.data);
          break;
        case 'server_shutdown':
          console.warn('Server shutting down:', message.data);
          break;
        default:
          // Forward to registered handlers
          this.notifyHandlers(message.type, message.data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Send message to server
   */
  send(message) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
      return false;
    }
  }

  /**
   * Subscribe to data channels
   */
  subscribe(channels) {
    if (!Array.isArray(channels)) {
      channels = [channels];
    }

    channels.forEach(channel => this.subscriptions.add(channel));

    if (this.isConnected) {
      return this.send({
        type: 'subscribe',
        data: { channels }
      });
    } else {
      console.log('WebSocket not connected, subscription will be sent on connect:', channels);
      return false;
    }
  }

  /**
   * Unsubscribe from data channels
   */
  unsubscribe(channels) {
    if (!Array.isArray(channels)) {
      channels = [channels];
    }

    channels.forEach(channel => this.subscriptions.delete(channel));

    if (this.isConnected) {
      return this.send({
        type: 'unsubscribe',
        data: { channels }
      });
    }
    return false;
  }

  /**
   * Resubscribe to all channels after reconnection
   */
  resubscribeAll() {
    if (this.subscriptions.size > 0) {
      const channels = Array.from(this.subscriptions);
      console.log('Resubscribing to channels:', channels);
      this.send({
        type: 'subscribe',
        data: { channels }
      });
    }
  }

  /**
   * Register message handler for specific message types
   */
  on(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    this.messageHandlers.get(messageType).add(handler);
  }

  /**
   * Unregister message handler
   */
  off(messageType, handler) {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(messageType);
      }
    }
  }

  /**
   * Notify registered handlers of incoming messages
   */
  notifyHandlers(messageType, data) {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in message handler for ${messageType}:`, error);
        }
      });
    }
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send trading action
   */
  sendTradingAction(actionData) {
    return this.send({
      type: 'trading_action',
      data: {
        ...actionData,
        actionId: actionData.actionId || Date.now().toString(),
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isReconnecting: this.isReconnecting,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: Array.from(this.subscriptions),
      readyState: this.ws ? this.ws.readyState : WebSocket.CLOSED
    };
  }
}

// Create singleton instance
const wsClient = new WebSocketClient();

// Auto-connect when module is imported
if (typeof window !== 'undefined') {
  wsClient.connect().catch(error => {
    console.error('Initial WebSocket connection failed:', error);
  });
}

export default wsClient;

// Export class for creating additional instances if needed
export { WebSocketClient };