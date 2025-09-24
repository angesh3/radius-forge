import { useEffect, useState, useRef, useCallback } from 'react';

const useWebSocket = (url = 'ws://localhost:8910/ws/telemetry') => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [telemetryData, setTelemetryData] = useState({
    currentRps: 0,
    targetRps: 0,
    deliveredPercent: 0,
    activeSockets: 0,
    latencyP50: 0,
    latencyP95: 0,
    latencyP99: 0,
    successRate: 0,
    errorRate: 0,
    timeoutRate: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    networkThroughput: '0 Gbps',
    alerts: []
  });
  
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const connect = useCallback(() => {
    try {
      // Create WebSocket connection
      ws.current = new WebSocket(url);
      
      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          
          // Update telemetry data based on message type
          if (data.type === 'telemetry' && data.metrics) {
            setTelemetryData(prev => ({
              ...prev,
              currentRps: data.metrics.current_rps || prev.currentRps,
              targetRps: data.metrics.target_rps || prev.targetRps,
              deliveredPercent: data.metrics.delivered_percent || prev.deliveredPercent,
              activeSockets: data.metrics.active_sockets || prev.activeSockets,
              latencyP50: data.metrics.p50_latency || prev.latencyP50,
              latencyP95: data.metrics.p95_latency || prev.latencyP95,
              latencyP99: data.metrics.p99_latency || prev.latencyP99,
              successRate: data.metrics.success_rate || prev.successRate,
              errorRate: data.metrics.error_rate || prev.errorRate,
              timeoutRate: data.metrics.timeout_rate || prev.timeoutRate,
              cpuUsage: data.metrics.cpu_usage || prev.cpuUsage,
              memoryUsage: data.metrics.memory_usage || prev.memoryUsage,
              networkThroughput: data.metrics.network_throughput || prev.networkThroughput,
              timestamp: data.timestamp
            }));
          }
          
          // Handle alerts
          if (data.alert) {
            setTelemetryData(prev => ({
              ...prev,
              alerts: [...prev.alerts.slice(-9), data.alert]
            }));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
      
      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        }
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    telemetryData,
    lastMessage,
    sendMessage,
    reconnect: connect,
    disconnect
  };
};

export default useWebSocket;