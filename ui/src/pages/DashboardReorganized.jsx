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
  Badge,
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
} from '@mui/icons-material';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import LiveTelemetry from '../components/LiveTelemetry';
import StandardCard from '../components/StandardCard';
import designSystem from '../theme/designSystem';

const { spacing, colors } = designSystem;

const DashboardReorganized = () => {
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
    { rps: 150, success: 100, latency: 8 },
    { rps: 500, success: 99.8, latency: 12 },
    { rps: 1000, success: 99.5, latency: 18 },
    { rps: 2500, success: 99.2, latency: 25 },
    { rps: 5000, success: 98.8, latency: 35 },
    { rps: 10000, success: 97.5, latency: 55 },
    { rps: 50000, success: 95.2, latency: 120 },
  ];

  // Incremental RPS performance data
  const incrementalRPSData = [
    { time: '00:00', actual: 0, target: 0 },
    { time: '00:30', actual: 150, target: 150 },
    { time: '01:00', actual: 480, target: 500 },
    { time: '01:30', actual: 980, target: 1000 },
    { time: '02:00', actual: 2450, target: 2500 },
    { time: '02:30', actual: 4920, target: 5000 },
    { time: '03:00', actual: 5247, target: 5000 },
  ];

  // Authentication methods distribution
  const authMethodsData = [
    { name: 'EAP-TLS', value: 45, color: colors.primary[700] },
    { name: 'PEAP', value: 30, color: colors.info.dark },
    { name: 'MAB', value: 15, color: colors.success.main },
    { name: 'PAP/CHAP', value: 10, color: colors.warning.main },
  ];

  const MetricCard = ({ icon: Icon, title, value, subtitle, trend, color = 'primary', size = 'medium' }) => (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent sx={{ p: size === 'small' ? 2 : 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            <Typography variant={size === 'small' ? 'h4' : 'h3'} sx={{ fontWeight: 700, my: 1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                {trend > 0 ? (
                  <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />
                )}
                <Typography variant="caption" color={trend > 0 ? 'success.main' : 'error.main'}>
                  {trend > 0 ? '+' : ''}{trend}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${color}.light`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.1,
            }}
          >
            <Icon sx={{ fontSize: 28, color: `${color}.main` }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const ServerCard = ({ name, status, type, metrics, isPrimary = false }) => {
    const getStatusColor = () => {
      switch (status) {
        case 'HEALTHY': return 'success';
        case 'WARNING': return 'warning';
        case 'ERROR': return 'error';
        case 'STANDBY': return 'info';
        default: return 'default';
      }
    };

    const getStatusIcon = () => {
      switch (status) {
        case 'HEALTHY': return <CheckIcon />;
        case 'WARNING': return <WarningIcon />;
        case 'ERROR': return <ErrorIcon />;
        default: return <CheckIcon />;
      }
    };

    return (
      <Card sx={{ height: '100%', borderTop: isPrimary ? `4px solid ${colors.primary[700]}` : 'none' }}>
        <CardContent>
          {isPrimary && (
            <Chip label="PRIMARY TARGET" size="small" color="primary" sx={{ mb: 1 }} />
          )}
          {type === 'OPTIONAL' && (
            <Chip label="OPTIONAL" size="small" variant="outlined" sx={{ mb: 1 }} />
          )}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            {name}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Chip
              icon={getStatusIcon()}
              label={status}
              color={getStatusColor()}
              size="small"
            />
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Latency</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{metrics.latency}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">RPS</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{metrics.rps}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">CPU</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{metrics.cpu}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Load</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{metrics.load}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            RadiusForge Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
        </Box>
        <IconButton onClick={() => setLastUpdated(new Date())} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* ROW 1: Current RPS, Connections, Tests, Uptime, System Resources */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            icon={SpeedIcon}
            title="Current RPS"
            value="5,247"
            subtitle="Target: 5,000"
            trend={5.2}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            icon={NetworkIcon}
            title="Connections"
            value="1,284"
            subtitle="Active sessions"
            trend={234}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            icon={DataIcon}
            title="Tests"
            value="42"
            subtitle="Running"
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            icon={UptimeIcon}
            title="Uptime"
            value="28d 14h"
            subtitle="System"
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                System Resources
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption">CPU</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>42%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={42} sx={{ mb: 1 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption">Memory</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>68%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={68} color="warning" sx={{ mb: 1 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Network</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>4.8 Gbps</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ROW 2: Asset Manager Servers and Cisco ISE Integration */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          AAA Infrastructure Status
        </Typography>
        
        <Grid container spacing={3}>
          {/* Asset Manager Servers */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Asset Manager Servers
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <ServerCard
                    name="Asset Manager Primary"
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
                <Grid item xs={12} sm={4}>
                  <ServerCard
                    name="Asset Manager Secondary"
                    status="HEALTHY"
                    metrics={{
                      latency: '15ms',
                      rps: '2,000',
                      cpu: '35%',
                      load: 'Normal'
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <ServerCard
                    name="Asset Manager DR"
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
            </Paper>
          </Grid>
          
          {/* Cisco ISE Integration */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Cisco ISE Integration
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <ServerCard
                    name="ISE PAN"
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
                <Grid item xs={12} sm={6}>
                  <ServerCard
                    name="ISE PSN-1"
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
              <Alert severity="info" sx={{ mt: 2 }}>
                ISE integration via pxGrid active. Asset Manager is primary AAA target.
              </Alert>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* ROW 3: Scale Test Points, Incremental RPS Performance, Authentication Methods */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Scale Test Points */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Scale Test Points
                </Typography>
                <Chip label="7 Configured" size="small" color="primary" variant="outlined" />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 3 }}>
                {/* Chart */}
                <Box sx={{ flex: 1 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={scaleTestData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.gray[200]} />
                      <XAxis 
                        dataKey="rps" 
                        tick={{ fontSize: 11 }}
                        label={{ value: 'RPS Target', position: 'insideBottom', offset: -10, style: { fontSize: 12 } }}
                      />
                      <YAxis 
                        yAxisId="left" 
                        orientation="left" 
                        stroke={colors.success.main}
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke={colors.warning.main}
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
                      />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: `1px solid ${colors.gray[300]}` }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar yAxisId="left" dataKey="success" fill={colors.success.main} name="Success %" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="latency" stroke={colors.warning.main} strokeWidth={2} dot={{ fill: colors.warning.main }} name="Latency" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                
                {/* Scale Points List */}
                <Box sx={{ width: 140 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    CONFIGURED POINTS
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {[150, 500, 1000, 2500, 5000, 10000, 50000].map((point, index) => (
                      <Box 
                        key={point}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          py: 0.75,
                          px: 1,
                          mb: 0.5,
                          borderRadius: 1,
                          bgcolor: index === 4 ? colors.primary[50] : 'transparent',
                          border: index === 4 ? `1px solid ${colors.primary[200]}` : '1px solid transparent',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: index === 4 ? 600 : 400 }}>
                          {point.toLocaleString()} RPS
                        </Typography>
                        {index === 4 && <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
              
              {/* Stats Summary */}
              <Box sx={{ display: 'flex', gap: 2, mt: 3, pt: 2, borderTop: `1px solid ${colors.gray[200]}` }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Current Target</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>5,000 RPS</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Success Rate</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>98.8%</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Avg Latency</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>35ms</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Incremental RPS Performance */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Incremental RPS Performance
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: colors.primary[700], borderRadius: '2px' }} />
                  <Typography variant="caption">Actual</Typography>
                  <Box sx={{ width: 12, height: 12, bgcolor: colors.gray[300], borderRadius: '2px', ml: 1 }} />
                  <Typography variant="caption">Target</Typography>
                </Box>
              </Box>
              
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={incrementalRPSData} margin={{ top: 10, right: 5, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.gray[400]} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colors.gray[400]} stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary[700]} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={colors.primary[700]} stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.gray[200]} />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Time (mm:ss)', position: 'insideBottom', offset: -10, style: { fontSize: 12 } }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Requests Per Second', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                  />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: `1px solid ${colors.gray[300]}` }}
                  />
                  <Area type="monotone" dataKey="target" stroke={colors.gray[400]} fillOpacity={1} fill="url(#colorTarget)" strokeWidth={2} strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="actual" stroke={colors.primary[700]} fillOpacity={1} fill="url(#colorActual)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
              
              {/* Performance Metrics */}
              <Box sx={{ display: 'flex', gap: 2, mt: 3, pt: 2, borderTop: `1px solid ${colors.gray[200]}` }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Ramp Time</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>3m 00s</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Achieved</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main' }}>105%</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Stability</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>Excellent</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Authentication Methods Distribution */}
        <Grid item xs={12} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Auth Methods
              </Typography>
              
              {/* Pie Chart */}
              <Box sx={{ position: 'relative', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={authMethodsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {authMethodsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <Box sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>4</Typography>
                  <Typography variant="caption" color="text.secondary">Methods</Typography>
                </Box>
              </Box>
              
              {/* Legend */}
              <Box sx={{ mt: 3 }}>
                {authMethodsData.map((method) => (
                  <Box 
                    key={method.name}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      mb: 1.5
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        bgcolor: method.color, 
                        borderRadius: '2px' 
                      }} />
                      <Typography variant="body2">{method.name}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {method.value}%
                    </Typography>
                  </Box>
                ))}
              </Box>
              
              {/* Total Auths */}
              <Box sx={{ 
                mt: 3, 
                pt: 2, 
                borderTop: `1px solid ${colors.gray[200]}`,
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <Typography variant="caption" color="text.secondary">Total Auths/hr</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>18.9M</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ROW 4: Live Telemetry */}
      <Box sx={{ mb: 3 }}>
        <LiveTelemetry />
      </Box>

      {/* ROW 5: Recent Activity & Alerts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Recent Activity
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Scale test completed successfully"
                    secondary="5,000 RPS sustained for 30 minutes - 2 mins ago"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <WarningIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="ISE PAN high CPU warning"
                    secondary="CPU usage at 65% - 15 mins ago"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="EAP-TLS certificate rotation completed"
                    secondary="1,245 certificates updated - 1 hour ago"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Active Alerts
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <AlertTitle>ISE PAN Resource Warning</AlertTitle>
                CPU utilization at 65%. Consider scaling or load redistribution.
              </Alert>
              <Alert severity="info">
                <AlertTitle>Scheduled Maintenance</AlertTitle>
                Asset Manager Secondary will undergo maintenance at 2:00 AM PST.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardReorganized;