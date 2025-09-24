import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Badge,
  Container,
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
  AccessTime as UptimeIcon,
  Computer as SystemIcon,
  Dns as ServerIcon,
  VpnKey as AuthIcon,
  PlayArrow,
  Stop,
  Schedule,
} from '@mui/icons-material';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, ComposedChart 
} from 'recharts';
import LiveTelemetry from '../components/LiveTelemetry';
import StandardCard from '../components/StandardCard';
import designSystem from '../theme/designSystem';

const { spacing, colors } = designSystem;

const DashboardOptimized = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Mock data for scale test points
  const scaleTestData = [
    { rps: 150, success: 100, latency: 8, throughput: 1.2 },
    { rps: 500, success: 99.8, latency: 12, throughput: 4.1 },
    { rps: 1000, success: 99.5, latency: 18, throughput: 8.2 },
    { rps: 2500, success: 99.2, latency: 25, throughput: 20.5 },
    { rps: 5000, success: 98.8, latency: 35, throughput: 41.0 },
    { rps: 10000, success: 97.5, latency: 55, throughput: 82.0 },
    { rps: 50000, success: 95.2, latency: 120, throughput: 410.0 },
  ];

  // Incremental RPS performance data
  const incrementalRPSData = [
    { time: '00:00', actual: 0, target: 0, errors: 0 },
    { time: '00:30', actual: 150, target: 150, errors: 0 },
    { time: '01:00', actual: 480, target: 500, errors: 1 },
    { time: '01:30', actual: 980, target: 1000, errors: 2 },
    { time: '02:00', actual: 2450, target: 2500, errors: 5 },
    { time: '02:30', actual: 4920, target: 5000, errors: 8 },
    { time: '03:00', actual: 5247, target: 5000, errors: 10 },
  ];

  // Authentication methods distribution
  const authMethodsData = [
    { name: 'EAP-TLS', value: 45, sessions: 125420 },
    { name: 'PEAP', value: 30, sessions: 83613 },
    { name: 'MAB', value: 15, sessions: 41807 },
    { name: 'PAP/CHAP', value: 10, sessions: 27871 },
  ];

  const systemResources = [
    { name: 'CPU', value: 42, status: 'normal', trend: 'stable' },
    { name: 'Memory', value: 68, status: 'warning', trend: 'increasing' },
    { name: 'Disk I/O', value: 35, status: 'normal', trend: 'stable' },
    { name: 'Network', value: 78, status: 'high', trend: 'increasing' },
  ];

  const CompactMetricCard = ({ icon: Icon, title, value, subtitle, trend, color = 'primary' }) => (
    <Card sx={{ height: '100%', position: 'relative' }}>
      <CardContent sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {title}
          </Typography>
          <Icon sx={{ fontSize: 16, color: `${color}.main`, opacity: 0.8 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            {subtitle}
          </Typography>
        )}
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mt: 0.5 }}>
            {trend > 0 ? (
              <TrendingUp sx={{ fontSize: 12, color: 'success.main' }} />
            ) : trend < 0 ? (
              <TrendingDown sx={{ fontSize: 12, color: 'error.main' }} />
            ) : null}
            {trend !== 0 && (
              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: trend > 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>
                {trend > 0 ? '+' : ''}{trend}%
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const ServerStatusCard = ({ name, status, type, metrics, isPrimary = false }) => {
    const getStatusColor = () => {
      switch (status) {
        case 'HEALTHY': return 'success';
        case 'WARNING': return 'warning';
        case 'ERROR': return 'error';
        case 'STANDBY': return 'info';
        default: return 'default';
      }
    };

    return (
      <Paper sx={{ p: 1.5, height: '100%', borderLeft: isPrimary ? `3px solid ${colors.primary[700]}` : 'none' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
              {name}
            </Typography>
            {isPrimary && (
              <Chip label="PRIMARY" size="small" sx={{ height: 16, fontSize: '0.6rem', mt: 0.5 }} />
            )}
            {type === 'OPTIONAL' && (
              <Chip label="OPTIONAL" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem', mt: 0.5 }} />
            )}
          </Box>
          <Chip
            label={status}
            color={getStatusColor()}
            size="small"
            sx={{ height: 18, fontSize: '0.65rem' }}
          />
        </Box>
        
        <Grid container spacing={0.5}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Latency</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{metrics.latency}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>RPS</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{metrics.rps}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>CPU</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{metrics.cpu}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Load</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{metrics.load}</Typography>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  return (
    <Box sx={{ width: '100%', height: '100vh', overflow: 'auto', bgcolor: colors.gray[50] }}>
      <Container maxWidth={false} sx={{ p: { xs: 1, sm: 1.5, md: 2 } }}>
        {/* Compact Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, py: 1 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              RadiusForge Operations Center
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last sync: {lastUpdated.toLocaleTimeString()} • Uptime: 28d 14h 32m
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              size="small" 
              startIcon={<PlayArrow />} 
              variant="contained" 
              sx={{ textTransform: 'none' }}
              onClick={() => navigate('/quick-test')}
            >
              Start Test
            </Button>
            <IconButton size="small" onClick={() => setLastUpdated(new Date())}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Top Metrics Bar - Full Width */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={4} md={2} lg={1.5}>
            <CompactMetricCard
              icon={SpeedIcon}
              title="RPS"
              value="5,247"
              subtitle="Target: 5,000"
              trend={5.2}
              color="primary"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2} lg={1.5}>
            <CompactMetricCard
              icon={NetworkIcon}
              title="Connections"
              value="1,284"
              subtitle="Active"
              trend={18}
              color="success"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2} lg={1.5}>
            <CompactMetricCard
              icon={DataIcon}
              title="Tests"
              value="42"
              subtitle="Running"
              trend={0}
              color="info"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2} lg={1.5}>
            <CompactMetricCard
              icon={ErrorIcon}
              title="Errors"
              value="12"
              subtitle="Last hour"
              trend={-25}
              color="error"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2} lg={1.5}>
            <CompactMetricCard
              icon={StorageIcon}
              title="Throughput"
              value="4.8 Gbps"
              subtitle="Network"
              trend={12}
              color="warning"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2} lg={1.5}>
            <CompactMetricCard
              icon={CheckIcon}
              title="Success"
              value="99.2%"
              subtitle="Auth rate"
              trend={0.5}
              color="success"
            />
          </Grid>
          <Grid item xs={12} lg={3}>
            {/* System Resources Mini */}
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>
                  System Health
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {systemResources.slice(0, 2).map((resource) => (
                    <Box key={resource.name} sx={{ mb: 0.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{resource.name}</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>{resource.value}%</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={resource.value} 
                        sx={{ height: 3 }}
                        color={resource.value > 70 ? 'warning' : 'primary'}
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content Area - Three Column Layout */}
        <Grid container spacing={1.5}>
          {/* Left Column - Infrastructure Status */}
          <Grid item xs={12} lg={3}>
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.85rem' }}>
                Access Manager Cluster
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <ServerStatusCard
                    name="AM-Primary"
                    status="HEALTHY"
                    isPrimary={true}
                    metrics={{
                      latency: '12ms',
                      rps: '3,247',
                      cpu: '38%',
                      load: 'Normal'
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <ServerStatusCard
                    name="AM-Secondary"
                    status="HEALTHY"
                    metrics={{
                      latency: '15ms',
                      rps: '2,000',
                      cpu: '35%',
                      load: 'Normal'
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <ServerStatusCard
                    name="AM-DR"
                    status="STANDBY"
                    metrics={{
                      latency: '45ms',
                      rps: '0',
                      cpu: '12%',
                      load: 'Standby'
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.85rem' }}>
                ISE Integration
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <ServerStatusCard
                    name="ISE-PAN"
                    status="WARNING"
                    type="OPTIONAL"
                    metrics={{
                      latency: '85ms',
                      rps: '450',
                      cpu: '65%',
                      load: 'High'
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <ServerStatusCard
                    name="ISE-PSN-1"
                    status="HEALTHY"
                    type="OPTIONAL"
                    metrics={{
                      latency: '32ms',
                      rps: '280',
                      cpu: '45%',
                      load: 'Normal'
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Auth Methods */}
            <Card>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.85rem' }}>
                  Authentication Mix
                </Typography>
                <Box sx={{ height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={authMethodsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {authMethodsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={[colors.primary[700], colors.info.dark, colors.success.main, colors.warning.main][index]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                {authMethodsData.map((method, index) => (
                  <Box key={method.name} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: [colors.primary[700], colors.info.dark, colors.success.main, colors.warning.main][index], borderRadius: '2px' }} />
                      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{method.name}</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>{method.value}%</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Center Column - Performance Charts */}
          <Grid item xs={12} lg={6}>
            {/* Scale Test Performance */}
            <Card sx={{ mb: 1.5 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Scale Test Performance
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label="7 Points" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                    <Chip label="Running" color="success" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                  </Box>
                </Box>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={scaleTestData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.gray[200]} />
                    <XAxis dataKey="rps" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                    <RechartsTooltip contentStyle={{ fontSize: '0.75rem' }} />
                    <Bar yAxisId="left" dataKey="success" fill={colors.success.main} opacity={0.8} />
                    <Line yAxisId="right" type="monotone" dataKey="latency" stroke={colors.warning.main} strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
                <Grid container spacing={1} sx={{ mt: 1 }}>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Current</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>5,000 RPS</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Success</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'success.main' }}>98.8%</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Latency</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'warning.main' }}>35ms</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Throughput</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>41 Gbps</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Incremental RPS */}
            <Card sx={{ mb: 1.5 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Incremental Load Ramp
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <Box sx={{ width: 8, height: 8, bgcolor: colors.primary[700], borderRadius: '50%' }} />
                    <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Actual</Typography>
                    <Box sx={{ width: 8, height: 8, bgcolor: colors.gray[400], borderRadius: '50%', ml: 1 }} />
                    <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Target</Typography>
                  </Box>
                </Box>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={incrementalRPSData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.primary[700]} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={colors.primary[700]} stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.gray[200]} />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip contentStyle={{ fontSize: '0.75rem' }} />
                    <Line type="monotone" dataKey="target" stroke={colors.gray[400]} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Area type="monotone" dataKey="actual" stroke={colors.primary[700]} fillOpacity={1} fill="url(#colorActual)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Live Telemetry Compact */}
            <Card>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.85rem' }}>
                  Live WebSocket Stream
                </Typography>
                <Box sx={{ height: 120, overflow: 'hidden' }}>
                  <LiveTelemetry />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Activity & Alerts */}
          <Grid item xs={12} lg={3}>
            {/* System Resources Detailed */}
            <Card sx={{ mb: 1.5 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.85rem' }}>
                  Resource Utilization
                </Typography>
                {systemResources.map((resource) => (
                  <Box key={resource.name} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{resource.name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>{resource.value}%</Typography>
                        {resource.trend === 'increasing' && <TrendingUp sx={{ fontSize: 10, color: 'warning.main' }} />}
                        {resource.trend === 'decreasing' && <TrendingDown sx={{ fontSize: 10, color: 'success.main' }} />}
                      </Box>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={resource.value} 
                      sx={{ height: 4, borderRadius: 2 }}
                      color={resource.status === 'warning' ? 'warning' : resource.status === 'high' ? 'error' : 'primary'}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card sx={{ mb: 1.5 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.85rem' }}>
                  Recent Activity
                </Typography>
                <List dense sx={{ p: 0 }}>
                  {[
                    { type: 'success', text: 'Scale test 5K RPS completed', time: '2m' },
                    { type: 'warning', text: 'ISE PAN high CPU (65%)', time: '15m' },
                    { type: 'info', text: 'Config sync completed', time: '1h' },
                    { type: 'success', text: 'EAP-TLS cert rotation', time: '2h' },
                  ].map((item, index) => (
                    <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        {item.type === 'success' && <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />}
                        {item.type === 'warning' && <WarningIcon sx={{ fontSize: 14, color: 'warning.main' }} />}
                        {item.type === 'info' && <InfoIcon sx={{ fontSize: 14, color: 'info.main' }} />}
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.text}
                        secondary={item.time}
                        primaryTypographyProps={{ fontSize: '0.7rem' }}
                        secondaryTypographyProps={{ fontSize: '0.65rem' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            {/* Active Alerts */}
            <Card>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.85rem' }}>
                  Active Alerts
                </Typography>
                <Alert severity="warning" sx={{ py: 0.5, px: 1, mb: 1, '& .MuiAlert-icon': { fontSize: 16 } }}>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>ISE Resource Warning</Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block' }}>
                    CPU at 65%. Scale or redistribute.
                  </Typography>
                </Alert>
                <Alert severity="info" sx={{ py: 0.5, px: 1, '& .MuiAlert-icon': { fontSize: 16 } }}>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>Maintenance Window</Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block' }}>
                    AM-Secondary at 2:00 AM PST
                  </Typography>
                </Alert>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card sx={{ mt: 1.5 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.85rem' }}>
                  Quick Actions
                </Typography>
                <Grid container spacing={0.5}>
                  <Grid item xs={6}>
                    <Button 
                      size="small" 
                      fullWidth 
                      variant="outlined" 
                      sx={{ fontSize: '0.7rem', py: 0.5 }}
                      onClick={() => navigate('/quick-test')}
                    >
                      New Test
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button 
                      size="small" 
                      fullWidth 
                      variant="outlined" 
                      sx={{ fontSize: '0.7rem', py: 0.5 }}
                      onClick={() => navigate('/live-logs')}
                    >
                      View Logs
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button 
                      size="small" 
                      fullWidth 
                      variant="outlined" 
                      sx={{ fontSize: '0.7rem', py: 0.5 }}
                      onClick={() => navigate('/report')}
                    >
                      Reports
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button 
                      size="small" 
                      fullWidth 
                      variant="outlined" 
                      sx={{ fontSize: '0.7rem', py: 0.5 }}
                      onClick={() => navigate('/configuration')}
                    >
                      Settings
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

// Add missing InfoIcon import at the top
const InfoIcon = SecurityIcon;

export default DashboardOptimized;