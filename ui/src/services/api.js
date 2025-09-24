import axios from 'axios';

// Configure axios with base URL and default settings
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8910/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth tokens or other headers
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Test Run API endpoints
export const testRunApi = {
  // Start a new test run
  start: (runConfig) => api.post('/runs', runConfig),
  
  // Get test run status and metrics
  getStatus: (runId) => api.get(`/runs/${runId}`),
  
  // Stop a running test
  stop: (runId) => api.post(`/runs/${runId}/stop`),
  
  // Pause/resume a test
  pause: (runId) => api.post(`/runs/${runId}/pause`),
  resume: (runId) => api.post(`/runs/${runId}/resume`),
  
  // Get live metrics for a running test
  getMetrics: (runId) => api.get(`/runs/${runId}/metrics`),
  
  // Export test results
  export: (runId, format = 'csv') => api.get(`/runs/${runId}/export`, {
    params: { format },
    responseType: 'blob'
  }),
  
  // Get all test runs with filtering
  getAll: (filters = {}) => api.get('/runs', { params: filters }),
  
  // Delete a test run
  delete: (runId) => api.delete(`/runs/${runId}`),
};

// Performance Test API endpoints
export const performanceTestApi = {
  // Start performance benchmark
  startBenchmark: (benchmarkConfig) => api.post('/performance/benchmark', benchmarkConfig),
  
  // Get benchmark results
  getResults: (benchmarkId) => api.get(`/performance/benchmark/${benchmarkId}`),
  
  // Compare with baseline
  compareBaseline: (benchmarkId, baselineId) => api.post(`/performance/compare`, {
    benchmarkId,
    baselineId
  }),
  
  // Get SLO definitions
  getSLOs: () => api.get('/performance/slos'),
  
  // Update SLO definitions
  updateSLOs: (slos) => api.put('/performance/slos', slos),
};

// Threat Generator API endpoints
export const threatGeneratorApi = {
  // Start threat generation
  start: (threatConfig) => api.post('/threats/start', threatConfig),
  
  // Stop threat generation
  stop: () => api.post('/threats/stop'),
  
  // Emergency kill switch
  killSwitch: () => api.post('/threats/kill-switch'),
  
  // Get threat modules configuration
  getModules: () => api.get('/threats/modules'),
  
  // Update threat module configuration
  updateModule: (moduleId, config) => api.put(`/threats/modules/${moduleId}`, config),
  
  // Get live telemetry
  getTelemetry: () => api.get('/threats/telemetry'),
  
  // Get safety controls
  getSafetyControls: () => api.get('/threats/safety-controls'),
  
  // Update safety controls
  updateSafetyControls: (controls) => api.put('/threats/safety-controls', controls),
};

// Report API endpoints
export const reportApi = {
  // Generate report
  generate: (reportConfig) => api.post('/reports/generate', reportConfig),
  
  // Get generated reports
  getAll: () => api.get('/reports'),
  
  // Download report
  download: (reportId) => api.get(`/reports/${reportId}/download`, {
    responseType: 'blob'
  }),
  
  // Email report
  email: (reportId, emailConfig) => api.post(`/reports/${reportId}/email`, emailConfig),
  
  // Delete report
  delete: (reportId) => api.delete(`/reports/${reportId}`),
  
  // Get report status
  getStatus: (reportId) => api.get(`/reports/${reportId}/status`),
};

// Topology API endpoints
export const topologyApi = {
  // Get topology data
  getTopology: () => api.get('/topology'),
  
  // Get node details
  getNode: (nodeId) => api.get(`/topology/nodes/${nodeId}`),
  
  // Update node configuration
  updateNode: (nodeId, config) => api.put(`/topology/nodes/${nodeId}`, config),
  
  // Get topology metrics
  getMetrics: () => api.get('/topology/metrics'),
  
  // Refresh topology discovery
  refresh: () => api.post('/topology/refresh'),
};

// Presets API endpoints
export const presetsApi = {
  // Get all presets
  getAll: () => api.get('/presets'),
  
  // Create new preset
  create: (preset) => api.post('/presets', preset),
  
  // Update preset
  update: (presetId, preset) => api.put(`/presets/${presetId}`, preset),
  
  // Delete preset
  delete: (presetId) => api.delete(`/presets/${presetId}`),
  
  // Load preset
  load: (presetId) => api.get(`/presets/${presetId}`),
};

// NAD (Network Access Device) API endpoints
export const nadApi = {
  // Get all NADs
  getAll: () => api.get('/nads'),
  
  // Create NAD
  create: (nad) => api.post('/nads', nad),
  
  // Update NAD
  update: (nadId, nad) => api.put(`/nads/${nadId}`, nad),
  
  // Delete NAD
  delete: (nadId) => api.delete(`/nads/${nadId}`),
  
  // Bulk upload NADs
  bulkUpload: (nads) => api.post('/nads/bulk', nads),
  
  // Test NAD connectivity
  testConnectivity: (nadId) => api.post(`/nads/${nadId}/test`),
};

// System API endpoints
export const systemApi = {
  // Get system status
  getStatus: () => api.get('/system/status'),
  
  // Get system metrics
  getMetrics: () => api.get('/system/metrics'),
  
  // Get system configuration
  getConfig: () => api.get('/system/config'),
  
  // Update system configuration
  updateConfig: (config) => api.put('/system/config', config),
  
  // Get system logs
  getLogs: (params = {}) => api.get('/system/logs', { params }),
  
  // Health check
  healthCheck: () => api.get('/health'),
};

// Authentication API endpoints
export const authApi = {
  // Login
  login: (credentials) => api.post('/auth/login', credentials),
  
  // Logout
  logout: () => api.post('/auth/logout'),
  
  // Refresh token
  refreshToken: () => api.post('/auth/refresh'),
  
  // Get current user
  getCurrentUser: () => api.get('/auth/me'),
  
  // Change password
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
};

// WebSocket connection helper
export const createWebSocketConnection = (endpoint, onMessage, onError) => {
  const wsUrl = process.env.REACT_APP_WS_BASE_URL || 'ws://localhost:8910/ws';
  const ws = new WebSocket(`${wsUrl}${endpoint}`);
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    if (onError) onError(error);
  };
  
  ws.onclose = () => {
    console.log('WebSocket connection closed');
  };
  
  return ws;
};

// Utility functions
export const apiUtils = {
  // Handle API errors consistently
  handleError: (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.statusText;
      return {
        message,
        status: error.response.status,
        data: error.response.data
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'Network error - please check your connection',
        status: 0,
        data: null
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
        status: 0,
        data: null
      };
    }
  },
  
  // Format file download
  downloadFile: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
  
  // Build query string from object
  buildQuery: (params) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        query.append(key, value);
      }
    });
    return query.toString();
  }
};

export default api;