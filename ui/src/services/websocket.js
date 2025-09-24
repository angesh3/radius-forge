// WebSocket service for real-time telemetry and live updates

class WebSocketService {
  constructor() {
    this.connections = new Map();
    this.messageHandlers = new Map();
    this.baseUrl = process.env.REACT_APP_WS_BASE_URL || 'ws://localhost:8910/ws';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  /**
   * Connect to a WebSocket endpoint
   * @param {string} endpoint - The WebSocket endpoint (e.g., '/live-metrics')
   * @param {Object} options - Connection options
   * @returns {string} Connection ID
   */
  connect(endpoint, options = {}) {
    const connectionId = `${endpoint}_${Date.now()}`;
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`Connecting to WebSocket: ${url}`);
    
    const ws = new WebSocket(url);
    const connectionInfo = {
      ws,
      endpoint,
      status: 'connecting',
      reconnectAttempts: 0,
      options,
      lastHeartbeat: Date.now()
    };

    ws.onopen = () => {
      console.log(`WebSocket connected: ${endpoint}`);
      connectionInfo.status = 'connected';
      connectionInfo.reconnectAttempts = 0;
      
      // Send authentication if provided
      if (options.auth) {
        this.send(connectionId, { type: 'auth', ...options.auth });
      }
      
      // Send initial subscription if provided
      if (options.subscribe) {
        this.send(connectionId, { type: 'subscribe', ...options.subscribe });
      }
      
      // Call onOpen callback
      if (options.onOpen) {
        options.onOpen(connectionId);
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        connectionInfo.lastHeartbeat = Date.now();
        
        // Handle heartbeat/ping messages
        if (data.type === 'ping') {
          this.send(connectionId, { type: 'pong' });
          return;
        }
        
        // Call message handler
        if (options.onMessage) {
          options.onMessage(data, connectionId);
        }
        
        // Call global message handlers
        const handlers = this.messageHandlers.get(data.type) || [];
        handlers.forEach(handler => handler(data, connectionId));
        
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        if (options.onError) {
          options.onError(error, connectionId);
        }
      }
    };

    ws.onclose = (event) => {
      console.log(`WebSocket closed: ${endpoint} (${event.code}: ${event.reason})`);
      connectionInfo.status = 'closed';
      
      // Call onClose callback
      if (options.onClose) {
        options.onClose(event, connectionId);
      }
      
      // Attempt reconnection if enabled
      if (options.autoReconnect !== false && connectionInfo.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnect(connectionId);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error: ${endpoint}`, error);
      connectionInfo.status = 'error';
      
      if (options.onError) {
        options.onError(error, connectionId);
      }
    };

    this.connections.set(connectionId, connectionInfo);
    return connectionId;
  }

  /**
   * Disconnect from a WebSocket
   * @param {string} connectionId - Connection ID to disconnect
   */
  disconnect(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws) {
      connection.ws.close(1000, 'Client disconnect');
      this.connections.delete(connectionId);
    }
  }

  /**
   * Send message through WebSocket connection
   * @param {string} connectionId - Connection ID
   * @param {Object} message - Message to send
   */
  send(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    } else {
      console.warn(`Cannot send message - connection ${connectionId} not ready`);
    }
  }

  /**
   * Reconnect to a WebSocket
   * @param {string} connectionId - Connection ID to reconnect
   */
  reconnect(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, connection.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect ${connection.endpoint} (attempt ${connection.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(() => {
      if (connection.reconnectAttempts <= this.maxReconnectAttempts) {
        const newConnectionId = this.connect(connection.endpoint, connection.options);
        // Update the connection ID in the map
        this.connections.delete(connectionId);
        this.connections.set(newConnectionId, connection);
      }
    }, delay);
  }

  /**
   * Subscribe to specific message types globally
   * @param {string} messageType - Type of message to listen for
   * @param {Function} handler - Handler function
   */
  subscribe(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType).push(handler);
  }

  /**
   * Unsubscribe from message types
   * @param {string} messageType - Type of message to stop listening for
   * @param {Function} handler - Handler function to remove
   */
  unsubscribe(messageType, handler) {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Get connection status
   * @param {string} connectionId - Connection ID
   * @returns {string} Connection status
   */
  getStatus(connectionId) {
    const connection = this.connections.get(connectionId);
    return connection ? connection.status : 'not_found';
  }

  /**
   * Check if connection is alive
   * @param {string} connectionId - Connection ID
   * @returns {boolean} True if connection is alive
   */
  isAlive(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;
    
    const timeSinceLastHeartbeat = Date.now() - connection.lastHeartbeat;
    return connection.status === 'connected' && timeSinceLastHeartbeat < 30000; // 30 seconds
  }

  /**
   * Disconnect all connections
   */
  disconnectAll() {
    this.connections.forEach((connection, connectionId) => {
      this.disconnect(connectionId);
    });
  }

  /**
   * Get all active connections
   * @returns {Array} Array of connection info
   */
  getActiveConnections() {
    const active = [];
    this.connections.forEach((connection, connectionId) => {
      if (connection.status === 'connected') {
        active.push({
          id: connectionId,
          endpoint: connection.endpoint,
          status: connection.status,
          lastHeartbeat: connection.lastHeartbeat
        });
      }
    });
    return active;
  }
}

// Create singleton instance
const wsService = new WebSocketService();

// Predefined connection helpers for common use cases

/**
 * Connect to live metrics feed for a test run
 * @param {string} runId - Test run ID
 * @param {Function} onMetrics - Callback for metrics updates
 * @param {Object} options - Additional options
 * @returns {string} Connection ID
 */
export const connectToLiveMetrics = (runId, onMetrics, options = {}) => {
  return wsService.connect('/live-metrics', {
    ...options,
    subscribe: { runId },
    onMessage: (data) => {
      if (data.type === 'metrics' && data.runId === runId) {
        onMetrics(data.metrics);
      }
    }
  });
};

/**
 * Connect to threat generator telemetry
 * @param {Function} onTelemetry - Callback for telemetry updates
 * @param {Object} options - Additional options
 * @returns {string} Connection ID
 */
export const connectToThreatTelemetry = (onTelemetry, options = {}) => {
  return wsService.connect('/threat-telemetry', {
    ...options,
    onMessage: (data) => {
      if (data.type === 'telemetry') {
        onTelemetry(data.telemetry);
      }
    }
  });
};

/**
 * Connect to topology updates
 * @param {Function} onTopologyUpdate - Callback for topology updates
 * @param {Object} options - Additional options
 * @returns {string} Connection ID
 */
export const connectToTopologyUpdates = (onTopologyUpdate, options = {}) => {
  return wsService.connect('/topology-updates', {
    ...options,
    onMessage: (data) => {
      if (data.type === 'topology_update') {
        onTopologyUpdate(data.topology);
      }
    }
  });
};

/**
 * Connect to system status updates
 * @param {Function} onStatusUpdate - Callback for status updates
 * @param {Object} options - Additional options
 * @returns {string} Connection ID
 */
export const connectToSystemStatus = (onStatusUpdate, options = {}) => {
  return wsService.connect('/system-status', {
    ...options,
    onMessage: (data) => {
      if (data.type === 'status_update') {
        onStatusUpdate(data.status);
      }
    }
  });
};

/**
 * Connect to performance test updates
 * @param {string} benchmarkId - Benchmark ID
 * @param {Function} onUpdate - Callback for updates
 * @param {Object} options - Additional options
 * @returns {string} Connection ID
 */
export const connectToPerformanceUpdates = (benchmarkId, onUpdate, options = {}) => {
  return wsService.connect('/performance-updates', {
    ...options,
    subscribe: { benchmarkId },
    onMessage: (data) => {
      if (data.type === 'performance_update' && data.benchmarkId === benchmarkId) {
        onUpdate(data.update);
      }
    }
  });
};

/**
 * Connect to report generation status
 * @param {string} reportId - Report ID
 * @param {Function} onStatus - Callback for status updates
 * @param {Object} options - Additional options
 * @returns {string} Connection ID
 */
export const connectToReportStatus = (reportId, onStatus, options = {}) => {
  return wsService.connect('/report-status', {
    ...options,
    subscribe: { reportId },
    onMessage: (data) => {
      if (data.type === 'report_status' && data.reportId === reportId) {
        onStatus(data.status);
      }
    }
  });
};

// React hook for WebSocket connections
export const useWebSocket = (endpoint, dependencies = []) => {
  const [connectionId, setConnectionId] = React.useState(null);
  const [status, setStatus] = React.useState('disconnected');
  const [lastMessage, setLastMessage] = React.useState(null);

  React.useEffect(() => {
    if (endpoint) {
      const id = wsService.connect(endpoint, {
        onOpen: () => setStatus('connected'),
        onClose: () => setStatus('disconnected'),
        onError: () => setStatus('error'),
        onMessage: (data) => setLastMessage(data)
      });
      
      setConnectionId(id);
      
      return () => {
        wsService.disconnect(id);
      };
    }
  }, [endpoint, ...dependencies]);

  const sendMessage = React.useCallback((message) => {
    if (connectionId) {
      wsService.send(connectionId, message);
    }
  }, [connectionId]);

  return {
    connectionId,
    status,
    lastMessage,
    sendMessage,
    disconnect: () => connectionId && wsService.disconnect(connectionId)
  };
};

export default wsService;