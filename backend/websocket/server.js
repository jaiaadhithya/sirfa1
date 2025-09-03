// SIRFA Agent Finance - WebSocket Server
// Real-time trading updates and notifications

const WebSocket = require('ws');
const http = require('http');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

class WebSocketServer {
  constructor() {
    this.server = null;
    this.wss = null;
    this.clients = new Map();
    this.rooms = new Map();
    this.heartbeatInterval = null;
    this.isRunning = false;
    this.integration = null;
  }

  /**
   * Set WebSocket integration service
   */
  setIntegration(integration) {
    this.integration = integration;
  }

  /**
   * Initialize and start the WebSocket server
   */
  async start() {
    try {
      // Create HTTP server for WebSocket
      this.server = http.createServer();
      
      // Create WebSocket server
      this.wss = new WebSocket.Server({
        server: this.server,
        path: '/ws',
        maxPayload: 16 * 1024, // 16KB max message size
      });

      // Set up connection handling
      this.wss.on('connection', this.handleConnection.bind(this));
      this.wss.on('error', this.handleServerError.bind(this));

      // Start HTTP server
      this.server.listen(config.websocket.port, () => {
        console.log(`WebSocket server started on port ${config.websocket.port}`);
        this.isRunning = true;
      });

      // Start heartbeat mechanism
      this.startHeartbeat();

      // Handle graceful shutdown
      process.on('SIGTERM', this.shutdown.bind(this));
      process.on('SIGINT', this.shutdown.bind(this));

    } catch (error) {
      console.error('Failed to start WebSocket server:', error);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connections
   */
  handleConnection(ws, request) {
    const clientId = uuidv4();
    const clientInfo = {
      id: clientId,
      ws: ws,
      isAlive: true,
      connectedAt: new Date(),
      lastActivity: new Date(),
      subscriptions: new Set(),
      userAgent: request.headers['user-agent'],
      ip: request.socket.remoteAddress
    };

    // Store client
    this.clients.set(clientId, clientInfo);

    console.log(`WebSocket client connected: ${clientId} (${this.clients.size} total)`);

    // Set up client event handlers
    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', (code, reason) => this.handleDisconnection(clientId, code, reason));
    ws.on('error', (error) => this.handleClientError(clientId, error));
    ws.on('pong', () => this.handlePong(clientId));

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connection',
      data: {
        clientId: clientId,
        timestamp: new Date().toISOString(),
        message: 'Connected to SIRFA WebSocket server'
      }
    });

    // Check connection limit
    if (this.clients.size > config.websocket.maxConnections) {
      console.warn(`WebSocket connection limit exceeded: ${this.clients.size}/${config.websocket.maxConnections}`);
    }
  }

  /**
   * Handle incoming messages from clients
   */
  handleMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'subscribe':
          this.handleSubscription(clientId, message.data);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(clientId, message.data);
          break;
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
          break;
        case 'trading_action':
          this.handleTradingAction(clientId, message.data);
          break;
        default:
          console.warn(`Unknown message type from client ${clientId}:`, message.type);
      }
    } catch (error) {
      console.error(`Error parsing message from client ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Invalid message format' }
      });
    }
  }

  /**
   * Handle client subscriptions to data streams
   */
  handleSubscription(clientId, subscriptionData) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channels } = subscriptionData;
    
    if (Array.isArray(channels)) {
      channels.forEach(channel => {
        client.subscriptions.add(channel);
        this.addToRoom(channel, clientId);
      });

      this.sendToClient(clientId, {
        type: 'subscription_confirmed',
        data: {
          channels: channels,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Client ${clientId} subscribed to channels:`, channels);
    }
  }

  /**
   * Handle client unsubscriptions
   */
  handleUnsubscription(clientId, subscriptionData) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channels } = subscriptionData;
    
    if (Array.isArray(channels)) {
      channels.forEach(channel => {
        client.subscriptions.delete(channel);
        this.removeFromRoom(channel, clientId);
      });

      this.sendToClient(clientId, {
        type: 'unsubscription_confirmed',
        data: {
          channels: channels,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Client ${clientId} unsubscribed from channels:`, channels);
    }
  }

  /**
   * Handle trading actions from clients
   */
  async handleTradingAction(clientId, actionData) {
    console.log(`Trading action from client ${clientId}:`, actionData);
    
    // Acknowledge receipt first
    this.sendToClient(clientId, {
      type: 'trading_action_received',
      data: {
        actionId: actionData.actionId || uuidv4(),
        status: 'received',
        timestamp: new Date().toISOString()
      }
    });

    // Delegate to integration service if available
    if (this.integration) {
      try {
        await this.integration.handleTradingAction(clientId, actionData);
      } catch (error) {
        console.error('Error in integration handleTradingAction:', error);
      }
    } else {
      console.warn('WebSocket integration not available for trading action');
    }
  }

  /**
   * Handle client disconnections
   */
  handleDisconnection(clientId, code, reason) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all rooms
    client.subscriptions.forEach(channel => {
      this.removeFromRoom(channel, clientId);
    });

    // Remove client
    this.clients.delete(clientId);

    console.log(`WebSocket client disconnected: ${clientId} (code: ${code}, reason: ${reason}) (${this.clients.size} remaining)`);
  }

  /**
   * Handle client errors
   */
  handleClientError(clientId, error) {
    console.error(`WebSocket client error (${clientId}):`, error);
  }

  /**
   * Handle server errors
   */
  handleServerError(error) {
    console.error('WebSocket server error:', error);
  }

  /**
   * Handle pong responses
   */
  handlePong(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.isAlive = true;
      client.lastActivity = new Date();
    }
  }

  /**
   * Add client to a room (channel)
   */
  addToRoom(room, clientId) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room).add(clientId);
  }

  /**
   * Remove client from a room (channel)
   */
  removeFromRoom(room, clientId) {
    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
      if (roomClients.size === 0) {
        this.rooms.delete(room);
      }
    }
  }

  /**
   * Send message to a specific client
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Broadcast message to all clients in a room
   */
  broadcastToRoom(room, message) {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return 0;

    let sentCount = 0;
    roomClients.forEach(clientId => {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    });

    return sentCount;
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastToAll(message) {
    let sentCount = 0;
    this.clients.forEach((client, clientId) => {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    });
    return sentCount;
  }

  /**
   * Start heartbeat mechanism to detect dead connections
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          console.log(`Terminating dead connection: ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }

        client.isAlive = false;
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      });
    }, config.websocket.heartbeatInterval);
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      connectedClients: this.clients.size,
      activeRooms: this.rooms.size,
      maxConnections: config.websocket.maxConnections,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      rooms: Array.from(this.rooms.keys()).map(room => ({
        name: room,
        clients: this.rooms.get(room).size
      }))
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('Shutting down WebSocket server...');
    
    this.isRunning = false;

    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    this.clients.forEach((client, clientId) => {
      this.sendToClient(clientId, {
        type: 'server_shutdown',
        data: { message: 'Server is shutting down' }
      });
      client.ws.close(1001, 'Server shutdown');
    });

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    // Close HTTP server
    if (this.server) {
      this.server.close();
    }

    console.log('WebSocket server shutdown complete');
  }

  // Public methods for broadcasting trading updates

  /**
   * Broadcast portfolio updates
   */
  broadcastPortfolioUpdate(portfolioData) {
    return this.broadcastToRoom('portfolio', {
      type: 'portfolio_update',
      data: portfolioData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast trading decisions
   */
  broadcastTradingDecision(decisionData) {
    return this.broadcastToRoom('trading', {
      type: 'trading_decision',
      data: decisionData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast market data updates
   */
  broadcastMarketData(marketData) {
    return this.broadcastToRoom('market', {
      type: 'market_data',
      data: marketData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast news updates
   */
  broadcastNewsUpdate(newsData) {
    return this.broadcastToRoom('news', {
      type: 'news_update',
      data: newsData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast system alerts
   */
  broadcastAlert(alertData) {
    return this.broadcastToAll({
      type: 'alert',
      data: alertData,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = WebSocketServer;