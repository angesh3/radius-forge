import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  Paper,
  Slider,
  Checkbox,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Badge,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  ExpandMore as ExpandMoreIcon,
  FlashOn as FlashIcon,
  BugReport as BugIcon,
  VpnKey as KeyIcon,
  Timer as TimerIcon,
  NetworkCheck as NetworkIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  PowerSettingsNew as PowerIcon,
  NotificationsActive as AlertIcon,
  Assessment as AssessmentIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const ThreatGeneratorEnhanced = () => {
  const [selectedModules, setSelectedModules] = useState([]);
  const [safetyControls, setSafetyControls] = useState({
    maxTrafficPercent: 10,
    errorThreshold: 15,
    autoThrottle: true,
    killSwitch: true,
    allowedCidr: '192.168.1.0/24',
    targetServer: 'Access Manager',
    targetHost: '192.168.1.10'
  });

  const [moduleConfigs, setModuleConfigs] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [telemetry, setTelemetry] = useState({
    dropReasons: {},
    parserErrors: 0,
    nasTimeouts: 0,
    alerts: [],
    totalPackets: 0,
    maliciousPackets: 0,
    blockedPackets: 0
  });
  
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const threatModules = [
    {
      id: 'burst-storms',
      name: 'Burst Storms',
      description: 'Generate micro-bursts of traffic (5-30 seconds)',
      category: 'Traffic',
      severity: 'medium',
      icon: <FlashIcon />,
      params: {
        burstDuration: { type: 'number', default: 15, min: 5, max: 30, unit: 'seconds' },
        burstInterval: { type: 'number', default: 60, min: 30, max: 300, unit: 'seconds' },
        burstMultiplier: { type: 'number', default: 5, min: 2, max: 20, unit: 'x' }
      }
    },
    {
      id: 'credential-spray',
      name: 'Credential Spray',
      description: 'Attempt authentication with unknown usernames and wrong secrets',
      category: 'Authentication',
      severity: 'high',
      icon: <KeyIcon />,
      params: {
        unknownUserPercent: { type: 'number', default: 50, min: 10, max: 90, unit: '%' },
        wrongSecretPercent: { type: 'number', default: 30, min: 10, max: 90, unit: '%' },
        usernameDictionary: { type: 'select', default: 'common', options: ['common', 'admin', 'service', 'custom'] }
      }
    },
    {
      id: 'protocol-fuzz',
      name: 'Protocol Fuzz',
      description: 'Send malformed AVPs and oversized packets',
      category: 'Protocol',
      severity: 'critical',
      icon: <BugIcon />,
      params: {
        malformedAvpPercent: { type: 'number', default: 5, min: 1, max: 20, unit: '%' },
        oversizePacketPercent: { type: 'number', default: 3, min: 1, max: 10, unit: '%' },
        maxPacketSize: { type: 'number', default: 8192, min: 4096, max: 65536, unit: 'bytes' }
      }
    },
    {
      id: 'latency-injection',
      name: 'Latency Injection',
      description: 'Introduce variable response delays',
      category: 'Timing',
      severity: 'low',
      icon: <TimerIcon />,
      params: {
        delayPercent: { type: 'number', default: 10, min: 5, max: 50, unit: '%' },
        minDelay: { type: 'number', default: 1000, min: 100, max: 5000, unit: 'ms' },
        maxDelay: { type: 'number', default: 5000, min: 1000, max: 30000, unit: 'ms' }
      }
    },
    {
      id: 'eap-attacks',
      name: 'EAP Attacks',
      description: 'Unsupported EAP attempts and downgrade attacks',
      category: 'Authentication',
      severity: 'high',
      icon: <SecurityIcon />,
      params: {
        unsupportedEapPercent: { type: 'number', default: 15, min: 5, max: 40, unit: '%' },
        downgradeAttempts: { type: 'boolean', default: true },
        eapTypes: { type: 'multiselect', default: ['EAP-MD4', 'EAP-SIM'], options: ['EAP-MD4', 'EAP-SIM', 'EAP-AKA', 'EAP-GTC'] }
      }
    },
    {
      id: 'coa-flood',
      name: 'CoA/Disconnect Floods',
      description: 'Send excessive CoA and Disconnect requests',
      category: 'CoA',
      severity: 'medium',
      icon: <NetworkIcon />,
      params: {
        coaRate: { type: 'number', default: 100, min: 10, max: 1000, unit: 'req/sec' },
        disconnectRate: { type: 'number', default: 50, min: 10, max: 500, unit: 'req/sec' },
        invalidSessionIds: { type: 'boolean', default: true }
      }
    },
    {
      id: 'syslog-flood',
      name: 'Syslog Flood',
      description: 'Generate high-volume syslog traffic with mixed priorities',
      category: 'Syslog',
      severity: 'low',
      icon: <StorageIcon />,
      params: {
        messagesPerSecond: { type: 'number', default: 1000, min: 100, max: 10000, unit: 'msg/sec' },
        facilityMix: { type: 'multiselect', default: ['local0', 'local1'], options: ['local0', 'local1', 'local2', 'local3', 'local4', 'local5', 'local6', 'local7'] },
        severityMix: { type: 'multiselect', default: ['info', 'warning'], options: ['emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug'] }
      }
    },
    {
      id: 'tacacs-storm',
      name: 'TACACS+ Command Storm',
      description: 'Send rapid-fire TACACS+ authorization requests',
      category: 'TACACS+',
      severity: 'medium',
      icon: <SpeedIcon />,
      params: {
        commandsPerSecond: { type: 'number', default: 500, min: 50, max: 5000, unit: 'cmd/sec' },
        commandTypes: { type: 'multiselect', default: ['show', 'configure'], options: ['show', 'configure', 'debug', 'clear', 'reload'] },
        privilegeEscalation: { type: 'boolean', default: true }
      }
    }
  ];

  const categories = ['all', ...new Set(threatModules.map(m => m.category))];

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        updateTelemetry();
        generateLog();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  const updateTelemetry = () => {
    setTelemetry(prev => ({
      dropReasons: {
        'Invalid AVP': Math.floor(Math.random() * 100 + prev.dropReasons['Invalid AVP'] || 0),
        'Oversized Packet': Math.floor(Math.random() * 50 + prev.dropReasons['Oversized Packet'] || 0),
        'Unknown User': Math.floor(Math.random() * 200 + prev.dropReasons['Unknown User'] || 0),
        'Wrong Secret': Math.floor(Math.random() * 150 + prev.dropReasons['Wrong Secret'] || 0),
        'Malformed Protocol': Math.floor(Math.random() * 75 + prev.dropReasons['Malformed Protocol'] || 0)
      },
      parserErrors: prev.parserErrors + Math.floor(Math.random() * 10),
      nasTimeouts: prev.nasTimeouts + Math.floor(Math.random() * 5),
      totalPackets: prev.totalPackets + Math.floor(Math.random() * 1000 + 500),
      maliciousPackets: prev.maliciousPackets + Math.floor(Math.random() * 100 + 50),
      blockedPackets: prev.blockedPackets + Math.floor(Math.random() * 50 + 25),
      alerts: prev.alerts.length < 10 ? [
        ...prev.alerts,
        {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          level: Math.random() > 0.7 ? 'critical' : Math.random() > 0.4 ? 'warning' : 'info',
          message: generateAlertMessage()
        }
      ] : [...prev.alerts.slice(1), {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        level: Math.random() > 0.7 ? 'critical' : Math.random() > 0.4 ? 'warning' : 'info',
        message: generateAlertMessage()
      }]
    }));
  };

  const generateAlertMessage = () => {
    const messages = [
      'Threshold breach: Error rate exceeded 15%',
      'Burst storm detected from 192.168.1.45',
      'Credential spray attempt blocked',
      'Protocol fuzzing detected and mitigated',
      'CoA flood in progress - auto-throttling activated',
      'Suspicious EAP downgrade attempt',
      'NAS timeout spike detected',
      'Malformed packet storm neutralized',
      'Auto-throttle engaged due to high error rate',
      'Kill switch armed - ready for emergency stop'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const generateLog = () => {
    const logTypes = [
      { level: 'INFO', message: 'Threat module execution in progress' },
      { level: 'WARNING', message: 'Approaching safety threshold limits' },
      { level: 'ERROR', message: 'Malformed packet rejected by parser' },
      { level: 'SUCCESS', message: 'Attack pattern successfully generated' },
      { level: 'INFO', message: `Target: ${safetyControls.targetServer} at ${safetyControls.targetHost}` },
      { level: 'WARNING', message: 'CPU utilization spike on threat generator' },
      { level: 'SUCCESS', message: 'Safety controls validated and active' },
    ];
    
    const randomLog = logTypes[Math.floor(Math.random() * logTypes.length)];
    setLogs(prev => [...prev.slice(-49), {
      timestamp: new Date().toISOString(),
      ...randomLog
    }]);
  };

  const handleModuleToggle = (moduleId) => {
    setSelectedModules(prev => 
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );

    if (!selectedModules.includes(moduleId)) {
      const module = threatModules.find(m => m.id === moduleId);
      const defaultConfig = {};
      Object.entries(module.params).forEach(([key, param]) => {
        defaultConfig[key] = param.default;
      });
      setModuleConfigs(prev => ({
        ...prev,
        [moduleId]: defaultConfig
      }));
    }
  };

  const handleModuleConfigChange = (moduleId, paramKey, value) => {
    setModuleConfigs(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [paramKey]: value
      }
    }));
  };

  const handleStartThreatGen = () => {
    if (selectedModules.length === 0) {
      return;
    }
    setIsRunning(true);
    setLogs([]);
    setTelemetry({
      dropReasons: {},
      parserErrors: 0,
      nasTimeouts: 0,
      alerts: [],
      totalPackets: 0,
      maliciousPackets: 0,
      blockedPackets: 0
    });
  };

  const handleStopThreatGen = () => {
    setIsRunning(false);
  };

  const handleKillSwitch = () => {
    setIsRunning(false);
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      level: 'CRITICAL',
      message: 'EMERGENCY KILL SWITCH ACTIVATED - All threat modules terminated'
    }]);
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getLogIcon = (level) => {
    switch(level) {
      case 'ERROR': case 'CRITICAL': return <ErrorIcon sx={{ color: 'error.main', fontSize: 16 }} />;
      case 'WARNING': return <WarningIcon sx={{ color: 'warning.main', fontSize: 16 }} />;
      case 'SUCCESS': return <InfoIcon sx={{ color: 'success.main', fontSize: 16 }} />;
      default: return <InfoIcon sx={{ color: 'info.main', fontSize: 16 }} />;
    }
  };

  const filteredModules = selectedCategory === 'all' 
    ? threatModules 
    : threatModules.filter(m => m.category === selectedCategory);

  const dropReasonData = Object.entries(telemetry.dropReasons).map(([reason, count]) => ({
    reason, count
  }));

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Threat Generator
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate adversarial traffic patterns to test {safetyControls.targetServer} resilience
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {isRunning && (
            <Chip 
              label="THREAT GENERATION ACTIVE" 
              color="error" 
              icon={<AlertIcon />}
              sx={{ animation: 'pulse 2s infinite' }}
            />
          )}
        </Box>
      </Box>

      {/* Safety Controls */}
      <Card sx={{ mb: 3, backgroundColor: 'warning.light', borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon /> Safety Controls
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Target Server</InputLabel>
                <Select
                  value={safetyControls.targetServer}
                  label="Target Server"
                  onChange={(e) => setSafetyControls({...safetyControls, targetServer: e.target.value})}
                  disabled={isRunning}
                >
                  <MenuItem value="Access Manager">Access Manager</MenuItem>
                  <MenuItem value="Cisco ISE">Cisco ISE</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Target Host"
                value={safetyControls.targetHost}
                onChange={(e) => setSafetyControls({...safetyControls, targetHost: e.target.value})}
                fullWidth
                size="small"
                disabled={isRunning}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Max Traffic %"
                type="number"
                value={safetyControls.maxTrafficPercent}
                onChange={(e) => setSafetyControls({...safetyControls, maxTrafficPercent: parseInt(e.target.value)})}
                fullWidth
                size="small"
                inputProps={{ min: 1, max: 50 }}
                disabled={isRunning}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Error Threshold %"
                type="number"
                value={safetyControls.errorThreshold}
                onChange={(e) => setSafetyControls({...safetyControls, errorThreshold: parseInt(e.target.value)})}
                fullWidth
                size="small"
                inputProps={{ min: 5, max: 50 }}
                disabled={isRunning}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Allowed CIDR"
                value={safetyControls.allowedCidr}
                onChange={(e) => setSafetyControls({...safetyControls, allowedCidr: e.target.value})}
                fullWidth
                size="small"
                disabled={isRunning}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={safetyControls.autoThrottle}
                  onChange={(e) => setSafetyControls({...safetyControls, autoThrottle: e.target.checked})}
                  disabled={isRunning}
                />
              }
              label="Auto Throttle"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={safetyControls.killSwitch}
                  onChange={(e) => setSafetyControls({...safetyControls, killSwitch: e.target.checked})}
                  color="error"
                />
              }
              label="Kill Switch Enabled"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={selectedCategory}
          exclusive
          onChange={(e, newCategory) => newCategory && setSelectedCategory(newCategory)}
          size="small"
        >
          {categories.map(category => (
            <ToggleButton key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Threat Modules */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {filteredModules.map(module => (
          <Grid item xs={12} sm={6} md={4} key={module.id}>
            <Card 
              sx={{ 
                height: '100%',
                border: selectedModules.includes(module.id) ? '2px solid' : '1px solid',
                borderColor: selectedModules.includes(module.id) ? 'error.main' : 'divider',
                backgroundColor: selectedModules.includes(module.id) ? 'error.light' : 'background.paper',
                opacity: selectedModules.includes(module.id) ? 1 : 0.9,
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Checkbox
                    checked={selectedModules.includes(module.id)}
                    onChange={() => handleModuleToggle(module.id)}
                    disabled={isRunning}
                    color="error"
                  />
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {module.icon}
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {module.name}
                      </Typography>
                      <Chip 
                        label={module.severity} 
                        size="small" 
                        color={getSeverityColor(module.severity)}
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {module.description}
                    </Typography>
                  </Box>
                </Box>
                
                {selectedModules.includes(module.id) && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Configuration</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        {Object.entries(module.params).map(([key, param]) => (
                          <Grid item xs={12} key={key}>
                            {param.type === 'number' && (
                              <TextField
                                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                type="number"
                                value={moduleConfigs[module.id]?.[key] || param.default}
                                onChange={(e) => handleModuleConfigChange(module.id, key, parseInt(e.target.value))}
                                fullWidth
                                size="small"
                                inputProps={{ min: param.min, max: param.max }}
                                InputProps={{
                                  endAdornment: <Typography variant="caption">{param.unit}</Typography>
                                }}
                                disabled={isRunning}
                              />
                            )}
                            {param.type === 'boolean' && (
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={moduleConfigs[module.id]?.[key] ?? param.default}
                                    onChange={(e) => handleModuleConfigChange(module.id, key, e.target.checked)}
                                    disabled={isRunning}
                                  />
                                }
                                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              />
                            )}
                            {param.type === 'select' && (
                              <FormControl fullWidth size="small">
                                <InputLabel>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</InputLabel>
                                <Select
                                  value={moduleConfigs[module.id]?.[key] || param.default}
                                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                  onChange={(e) => handleModuleConfigChange(module.id, key, e.target.value)}
                                  disabled={isRunning}
                                >
                                  {param.options.map(option => (
                                    <MenuItem key={option} value={option}>{option}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            )}
                          </Grid>
                        ))}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Live Telemetry */}
      {isRunning && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Drop Reason Analysis
                </Typography>
                <Box sx={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dropReasonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="reason" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#ff5252" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Attack Metrics
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText primary="Total Packets" secondary={telemetry.totalPackets.toLocaleString()} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Malicious Packets" secondary={telemetry.maliciousPackets.toLocaleString()} />
                    <Chip 
                      label={`${((telemetry.maliciousPackets / telemetry.totalPackets) * 100).toFixed(1)}%`}
                      color="error"
                      size="small"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Blocked Packets" secondary={telemetry.blockedPackets.toLocaleString()} />
                    <Chip 
                      label={`${((telemetry.blockedPackets / telemetry.maliciousPackets) * 100).toFixed(1)}%`}
                      color="success"
                      size="small"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Parser Errors" secondary={telemetry.parserErrors} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="NAS Timeouts" secondary={telemetry.nasTimeouts} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Recent Alerts
                </Typography>
                <List dense>
                  {telemetry.alerts.slice(-5).map(alert => (
                    <ListItem key={alert.id}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {alert.level === 'critical' ? <ErrorIcon color="error" /> : 
                         alert.level === 'warning' ? <WarningIcon color="warning" /> : 
                         <InfoIcon color="info" />}
                      </ListItemIcon>
                      <ListItemText 
                        primary={alert.message}
                        secondary={new Date(alert.timestamp).toLocaleTimeString()}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Logs Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Threat Generation Logs
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControlLabel
                control={<Switch checked={showLogs} onChange={(e) => setShowLogs(e.target.checked)} />}
                label="Auto-scroll"
              />
              <Button size="small" variant="outlined" onClick={() => setLogs([])}>
                Clear
              </Button>
            </Box>
          </Box>
          
          <Paper 
            sx={{ 
              p: 2, 
              maxHeight: 300, 
              overflow: 'auto',
              backgroundColor: 'grey.900',
              '& pre': {
                margin: 0,
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '12px',
                lineHeight: 1.5
              }
            }}
          >
            {logs.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'grey.500', fontFamily: 'monospace' }}>
                No logs yet. Start threat generation to see activity logs...
              </Typography>
            ) : (
              logs.map((log, index) => (
                <Box key={index} sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getLogIcon(log.level)}
                  <pre style={{ 
                    color: log.level === 'ERROR' || log.level === 'CRITICAL' ? '#ff5252' : 
                           log.level === 'WARNING' ? '#ffa726' : 
                           log.level === 'SUCCESS' ? '#66bb6a' :
                           '#90caf9'
                  }}>
                    [{new Date(log.timestamp).toLocaleTimeString()}] [{log.level}] {log.message}
                  </pre>
                </Box>
              ))
            )}
          </Paper>
        </CardContent>
      </Card>

      {/* Control Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        {!isRunning ? (
          <Button
            variant="contained"
            color="error"
            size="large"
            startIcon={<PlayIcon />}
            onClick={handleStartThreatGen}
            disabled={selectedModules.length === 0}
            sx={{ px: 4 }}
          >
            Start Threat Generation
          </Button>
        ) : (
          <>
            <Button
              variant="contained"
              color="grey"
              size="large"
              startIcon={<StopIcon />}
              onClick={handleStopThreatGen}
            >
              Stop Threat Generation
            </Button>
            {safetyControls.killSwitch && (
              <Button
                variant="contained"
                color="error"
                size="large"
                startIcon={<PowerIcon />}
                onClick={handleKillSwitch}
                sx={{ 
                  animation: 'pulse 1s infinite',
                  '@keyframes pulse': {
                    '0%': { boxShadow: '0 0 0 0 rgba(255, 68, 68, 0.7)' },
                    '70%': { boxShadow: '0 0 0 10px rgba(255, 68, 68, 0)' },
                    '100%': { boxShadow: '0 0 0 0 rgba(255, 68, 68, 0)' }
                  }
                }}
              >
                EMERGENCY KILL SWITCH
              </Button>
            )}
          </>
        )}
      </Box>
      
      {selectedModules.length === 0 && !isRunning && (
        <Alert severity="info" sx={{ mt: 2, justifyContent: 'center' }}>
          Select at least one threat module to begin threat generation
        </Alert>
      )}
    </Box>
  );
};

export default ThreatGeneratorEnhanced;