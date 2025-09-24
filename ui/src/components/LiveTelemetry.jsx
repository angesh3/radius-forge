import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Badge,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Speed as SpeedIcon,
  NetworkCheck as NetworkIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  WifiTethering as ConnectedIcon,
  WifiTetheringOff as DisconnectedIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import useWebSocket from '../hooks/useWebSocket';

const LiveTelemetry = () => {
  const { isConnected, telemetryData, reconnect } = useWebSocket();
  
  // Store historical data for chart
  const [historicalData, setHistoricalData] = React.useState([]);
  
  React.useEffect(() => {
    if (telemetryData.timestamp) {
      setHistoricalData(prev => {
        const newData = [...prev, {
          time: new Date(telemetryData.timestamp).toLocaleTimeString(),
          rps: telemetryData.currentRps,
          latency: telemetryData.latencyP95,
          errorRate: telemetryData.errorRate
        }];
        // Keep only last 20 data points
        return newData.slice(-20);
      });
    }
  }, [telemetryData.timestamp]);

  const MetricCard = ({ title, value, subtitle, icon: Icon, color = 'primary', trend }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          <Icon sx={{ fontSize: 20, color: `${color}.main` }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        {trend !== undefined && (
          <LinearProgress
            variant="determinate"
            value={trend}
            sx={{ mt: 1, height: 4, borderRadius: 2 }}
            color={color}
          />
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Connection Status Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Live Telemetry
          </Typography>
          <Badge
            color={isConnected ? 'success' : 'error'}
            variant="dot"
            sx={{ '& .MuiBadge-dot': { width: 12, height: 12 } }}
          >
            <Chip
              icon={isConnected ? <ConnectedIcon /> : <DisconnectedIcon />}
              label={isConnected ? 'Connected' : 'Disconnected'}
              color={isConnected ? 'success' : 'error'}
              variant="outlined"
              size="small"
            />
          </Badge>
        </Box>
        
        {!isConnected && (
          <Tooltip title="Reconnect WebSocket">
            <IconButton onClick={reconnect} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Real-time Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <MetricCard
            title="Current RPS"
            value={telemetryData.currentRps.toLocaleString()}
            subtitle={`Target: ${telemetryData.targetRps.toLocaleString()}`}
            icon={SpeedIcon}
            color="primary"
            trend={telemetryData.deliveredPercent}
          />
        </Grid>
        
        <Grid item xs={6} sm={4} md={2}>
          <MetricCard
            title="Active Sockets"
            value={telemetryData.activeSockets}
            icon={NetworkIcon}
            color="info"
          />
        </Grid>
        
        <Grid item xs={6} sm={4} md={2}>
          <MetricCard
            title="p95 Latency"
            value={`${telemetryData.latencyP95}ms`}
            icon={TimerIcon}
            color="warning"
          />
        </Grid>
        
        <Grid item xs={6} sm={4} md={2}>
          <MetricCard
            title="Success Rate"
            value={`${telemetryData.successRate.toFixed(1)}%`}
            icon={CheckIcon}
            color="success"
          />
        </Grid>
        
        <Grid item xs={6} sm={4} md={2}>
          <MetricCard
            title="Error Rate"
            value={`${telemetryData.errorRate.toFixed(2)}%`}
            icon={ErrorIcon}
            color={telemetryData.errorRate > 1 ? 'error' : 'success'}
          />
        </Grid>
        
        <Grid item xs={6} sm={4} md={2}>
          <MetricCard
            title="Network"
            value={telemetryData.networkThroughput}
            icon={NetworkIcon}
            color="primary"
          />
        </Grid>
      </Grid>

      {/* Real-time Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Real-time Performance Trends
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" label={{ value: 'RPS', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight' }} />
                <RechartsTooltip />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="rps"
                  stroke="#1565C0"
                  strokeWidth={2}
                  dot={false}
                  name="RPS"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="latency"
                  stroke="#FF9800"
                  strokeWidth={2}
                  dot={false}
                  name="p95 Latency"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="errorRate"
                  stroke="#f44336"
                  strokeWidth={2}
                  dot={false}
                  name="Error Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* System Resources */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                System Resources
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">CPU Usage</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {telemetryData.cpuUsage}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={telemetryData.cpuUsage}
                  color={telemetryData.cpuUsage > 80 ? 'error' : telemetryData.cpuUsage > 60 ? 'warning' : 'primary'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Memory Usage</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {telemetryData.memoryUsage}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={telemetryData.memoryUsage}
                  color={telemetryData.memoryUsage > 80 ? 'error' : telemetryData.memoryUsage > 60 ? 'warning' : 'success'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Recent Alerts
              </Typography>
              
              {telemetryData.alerts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No alerts at this time
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
                  {telemetryData.alerts.map((alert, index) => (
                    <Alert
                      key={index}
                      severity={alert.level === 'critical' ? 'error' : alert.level}
                      sx={{ mb: 1 }}
                    >
                      {alert.message}
                    </Alert>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LiveTelemetry;