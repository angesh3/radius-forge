import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Button,
  Alert,
  AlertTitle,
  Tooltip,
  CircularProgress,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkIcon,
  AccountTree as TopologyIcon,
  Router as RouterIcon,
  DataUsage as DataIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import LiveTelemetry from '../components/LiveTelemetry';

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock data for demonstration
  const [systemStats, setSystemStats] = useState({
    currentRPS: 5247,
    targetRPS: 5000,
    totalTests: 42,
    activeConnections: 1284,
    uptime: '28d 14h 32m',
    cpuUsage: 42,
    memoryUsage: 67,
    diskUsage: 23,
    networkThroughput: '4.8 Gbps'
  });

  const [realtimeMetrics, setRealtimeMetrics] = useState([
    { time: '10:00', rps: 100, latency: 15, errors: 0 },
    { time: '10:05', rps: 200, latency: 18, errors: 0 },
    { time: '10:10', rps: 500, latency: 22, errors: 1 },
    { time: '10:15', rps: 1000, latency: 28, errors: 2 },
    { time: '10:20', rps: 2000, latency: 35, errors: 3 },
    { time: '10:25', rps: 3500, latency: 42, errors: 4 },
    { time: '10:30', rps: 5000, latency: 48, errors: 5 },
    { time: '10:35', rps: 5247, latency: 52, errors: 6 },
  ]);

  const [testDistribution, setTestDistribution] = useState([
    { name: 'EAP-TLS', value: 35, color: '#1565C0' },
    { name: 'MAB', value: 30, color: '#2E7D32' },
    { name: '802.1X', value: 20, color: '#F57C00' },
    { name: 'PEAP', value: 10, color: '#7B1FA2' },
    { name: 'Others', value: 5, color: '#757575' },
  ]);

  const [recentAlerts, setRecentAlerts] = useState([
    { id: 1, type: 'success', message: 'Asset Manager Primary - Scale test successful at 5000 RPS', time: '2 min ago' },
    { id: 2, type: 'info', message: 'Asset Manager Secondary - Configuration sync completed', time: '15 min ago' },
    { id: 3, type: 'warning', message: 'ISE Integration - High latency on pxGrid connection', time: '45 min ago' },
    { id: 4, type: 'info', message: 'MAB authentication test profile created for 802.1X switches', time: '1 hour ago' },
  ]);

  const [assetManagerServers, setAssetManagerServers] = useState([
    { name: 'Asset Manager Primary', status: 'healthy', latency: '12ms', rps: 3247, cpu: 38, load: 'Normal' },
    { name: 'Asset Manager Secondary', status: 'healthy', latency: '15ms', rps: 2000, cpu: 35, load: 'Normal' },
    { name: 'Asset Manager DR', status: 'standby', latency: '45ms', rps: 0, cpu: 12, load: 'Standby' },
  ]);

  const [iseServers, setIseServers] = useState([
    { name: 'ISE PAN', status: 'warning', latency: '85ms', rps: 450, cpu: 65, load: 'High' },
    { name: 'ISE PSN-1', status: 'healthy', latency: '32ms', rps: 280, cpu: 45, load: 'Normal' },
  ]);

  const [scalePoints] = useState([
    { scale: 100, p95: 12, p99: 18, success: 100 },
    { scale: 200, p95: 15, p99: 22, success: 100 },
    { scale: 500, p95: 20, p99: 28, success: 99.9 },
    { scale: 1000, p95: 25, p99: 35, success: 99.8 },
    { scale: 1500, p95: 30, p99: 42, success: 99.7 },
    { scale: 2000, p95: 32, p99: 45, success: 99.5 },
    { scale: 2500, p95: 38, p99: 52, success: 99.3 },
    { scale: 3000, p95: 42, p99: 58, success: 99.2 },
    { scale: 5000, p95: 48, p99: 65, success: 99.0 },
    { scale: 10000, p95: 72, p99: 95, success: 98.8 },
    { scale: 50000, p95: 145, p99: 180, success: 97.5 },
    { scale: 100000, p95: 220, p99: 280, success: 96.2 },
  ]);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      // Update metrics with slight variations
      setSystemStats(prev => ({
        ...prev,
        currentRPS: prev.currentRPS + Math.floor(Math.random() * 200 - 100),
        activeConnections: prev.activeConnections + Math.floor(Math.random() * 50 - 25),
      }));
      setLoading(false);
    }, 1000);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckIcon sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />;
      case 'standby':
        return <DataIcon sx={{ color: 'info.main', fontSize: 20 }} />;
      default:
        return <CheckIcon sx={{ color: 'success.main', fontSize: 20 }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'standby':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  const PrimaryMetricCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary' }) => (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
            {title}
          </Typography>
          <Icon sx={{ fontSize: 20, color: `${color}.main` }} />
        </Box>
        <Typography variant="h4" component="div" sx={{ fontWeight: 600, mb: 0.5 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {subtitle}
          </Typography>
        )}
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
            {trend === 'up' ? (
              <TrendingUp sx={{ color: 'success.main', fontSize: 16 }} />
            ) : (
              <TrendingDown sx={{ color: 'error.main', fontSize: 16 }} />
            )}
            <Typography 
              variant="caption" 
              sx={{ 
                color: trend === 'up' ? 'success.main' : 'error.main',
                fontWeight: 500,
                fontSize: '0.75rem'
              }}
            >
              {trendValue}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time Asset Manager and RADIUS testing metrics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Row 1: All 6 Metrics in One Level */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <PrimaryMetricCard
            title="Current RPS"
            value={`${formatNumber(systemStats.currentRPS)}`}
            subtitle={`Target: ${formatNumber(systemStats.targetRPS)}`}
            icon={SpeedIcon}
            trend="up"
            trendValue="+5.2%"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <PrimaryMetricCard
            title="Connections"
            value={formatNumber(systemStats.activeConnections)}
            subtitle="Active sessions"
            icon={NetworkIcon}
            trend="up"
            trendValue="+234"
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <PrimaryMetricCard
            title="Tests"
            value={systemStats.totalTests}
            subtitle="Running"
            icon={TimelineIcon}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <PrimaryMetricCard
            title="Uptime"
            value={systemStats.uptime}
            subtitle="System"
            icon={CheckIcon}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <PrimaryMetricCard
            title="CPU"
            value={`${systemStats.cpuUsage}%`}
            subtitle="Usage"
            icon={MemoryIcon}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <PrimaryMetricCard
            title="Network"
            value={systemStats.networkThroughput}
            subtitle="Throughput"
            icon={DataIcon}
            color="primary"
          />
        </Grid>

        {/* Row 2: Asset Manager and ISE Servers in One Level */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <RouterIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Asset Manager Servers
                </Typography>
                <Chip label="PRIMARY TARGET" size="small" color="primary" sx={{ ml: 'auto' }} />
              </Box>
              <List>
                {assetManagerServers.map((server, index) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {getStatusIcon(server.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {server.name}
                            </Typography>
                            <Chip
                              label={server.status.toUpperCase()}
                              size="small"
                              color={getStatusColor(server.status)}
                              variant="outlined"
                              sx={{ height: 20 }}
                            />
                          </Box>
                        }
                        secondary={
                          <Grid container spacing={2} sx={{ mt: 0.5 }}>
                            <Grid item xs={3}>
                              <Typography variant="caption" color="text.secondary">Latency</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{server.latency}</Typography>
                            </Grid>
                            <Grid item xs={3}>
                              <Typography variant="caption" color="text.secondary">RPS</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatNumber(server.rps)}</Typography>
                            </Grid>
                            <Grid item xs={3}>
                              <Typography variant="caption" color="text.secondary">CPU</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{server.cpu}%</Typography>
                            </Grid>
                            <Grid item xs={3}>
                              <Typography variant="caption" color="text.secondary">Load</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{server.load}</Typography>
                            </Grid>
                          </Grid>
                        }
                      />
                    </ListItem>
                    {index < assetManagerServers.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TopologyIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Cisco ISE Integration
                </Typography>
                <Chip label="OPTIONAL" size="small" variant="outlined" sx={{ ml: 'auto' }} />
              </Box>
              <List>
                {iseServers.map((server, index) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {getStatusIcon(server.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {server.name}
                            </Typography>
                            <Chip
                              label={server.status.toUpperCase()}
                              size="small"
                              color={getStatusColor(server.status)}
                              variant="outlined"
                              sx={{ height: 20 }}
                            />
                          </Box>
                        }
                        secondary={
                          <Grid container spacing={2} sx={{ mt: 0.5 }}>
                            <Grid item xs={3}>
                              <Typography variant="caption" color="text.secondary">Latency</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{server.latency}</Typography>
                            </Grid>
                            <Grid item xs={3}>
                              <Typography variant="caption" color="text.secondary">RPS</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatNumber(server.rps)}</Typography>
                            </Grid>
                            <Grid item xs={3}>
                              <Typography variant="caption" color="text.secondary">CPU</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{server.cpu}%</Typography>
                            </Grid>
                            <Grid item xs={3}>
                              <Typography variant="caption" color="text.secondary">Load</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{server.load}</Typography>
                            </Grid>
                          </Grid>
                        }
                      />
                    </ListItem>
                    {index < iseServers.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  ISE integration via pxGrid active. Asset Manager is primary AAA target.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Row 3: Performance Chart and Authentication Methods in One Level */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Incremental RPS Performance
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Real-time performance metrics with latency tracking from 100 to 100,000 RPS
              </Typography>
              <Box sx={{ height: 400, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={realtimeMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="time" stroke="#666" />
                    <YAxis yAxisId="left" stroke="#666" label={{ value: 'RPS', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#666" label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight' }} />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="rps" 
                      stroke="#1565C0" 
                      strokeWidth={3}
                      dot={{ fill: '#1565C0', strokeWidth: 2, r: 4 }}
                      name="Requests per Second"
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="latency" 
                      stroke="#2E7D32" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: '#2E7D32', strokeWidth: 2, r: 3 }}
                      name="p95 Latency"
                    />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="errors" 
                      stroke="#d32f2f" 
                      strokeWidth={2}
                      dot={{ fill: '#d32f2f', strokeWidth: 1, r: 3 }}
                      name="Errors"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Authentication Methods Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current test profile distribution
              </Typography>
              <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={testDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {testDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2 }}>
                {testDistribution.map((item) => (
                  <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        backgroundColor: item.color,
                        borderRadius: '2px',
                        mr: 1.5,
                      }}
                    />
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {item.name}
                    </Typography>
                    <Chip 
                      label={`${item.value}%`} 
                      size="small" 
                      sx={{ height: 20 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Row 4: System Resources and Scale Points */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                System Resources
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">CPU Usage</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {systemStats.cpuUsage}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={systemStats.cpuUsage} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Memory Usage</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {systemStats.memoryUsage}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={systemStats.memoryUsage} 
                    sx={{ height: 8, borderRadius: 4 }}
                    color="warning"
                  />
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Disk Usage</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {systemStats.diskUsage}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={systemStats.diskUsage} 
                    sx={{ height: 8, borderRadius: 4 }}
                    color="success"
                  />
                </Box>

                <Paper sx={{ p: 2, mt: 3, backgroundColor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <NetworkIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      Network Throughput
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {systemStats.networkThroughput}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Scale Test Points
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Performance at different RPS levels
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Box sx={{ minWidth: 400 }}>
                  <Grid container sx={{ mb: 1, borderBottom: '2px solid', borderColor: 'divider', pb: 1 }}>
                    <Grid item xs={3}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>RPS</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>p95 (ms)</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>p99 (ms)</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>Success %</Typography>
                    </Grid>
                  </Grid>
                  {scalePoints.map((point, index) => (
                    <Grid container key={index} sx={{ mb: 1, py: 0.5, '&:hover': { backgroundColor: 'action.hover' } }}>
                      <Grid item xs={3}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatNumber(point.scale)}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color={point.p95 < 50 ? 'success.main' : point.p95 < 100 ? 'warning.main' : 'error.main'}>
                          {point.p95}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color={point.p99 < 75 ? 'success.main' : point.p99 < 150 ? 'warning.main' : 'error.main'}>
                          {point.p99}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Chip 
                          label={`${point.success}%`}
                          size="small"
                          color={point.success >= 99.5 ? 'success' : point.success >= 99 ? 'warning' : 'error'}
                          variant="outlined"
                        />
                      </Grid>
                    </Grid>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Row 5: Live WebSocket Telemetry */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Live WebSocket Telemetry
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <LiveTelemetry />
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Row 6: Recent Alerts - Full Width */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Recent Events & Activities
              </Typography>
              <Box sx={{ mt: 2 }}>
                {recentAlerts.map((alert) => (
                  <Alert 
                    key={alert.id} 
                    severity={alert.type} 
                    sx={{ mb: 1.5 }}
                    action={
                      <Typography variant="caption" color="text.secondary">
                        {alert.time}
                      </Typography>
                    }
                  >
                    {alert.message}
                  </Alert>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;