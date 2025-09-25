import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
  Paper,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';

const ScaleTest = () => {
  const [target, setTarget] = useState({
    host: '192.168.1.10',
    port: 1812,
    secret: '',
    type: 'Access Manager'
  });
  
  const [trafficConfig, setTrafficConfig] = useState({
    type: 'RADIUS',
    authType: 'EAP-TLS',
    rpsProfile: 'Incremental',
    startRps: 100,
    endRps: 5000,
    rampSteps: 10,
    stepDuration: 60,
    duration: 600,
    clients: 50,
    accounting: true,
    rejectRate: 0,
    selectedScalePoints: [150, 200, 500, 1000, 2000, 5000]
  });

  const [liveKpis, setLiveKpis] = useState({
    currentRps: 0,
    targetRps: 0,
    deliveredPercent: 0,
    tps: 0,
    activeSockets: 0,
    latencyP50: 0,
    latencyP95: 0,
    latencyP99: 0,
    successRate: 0,
    errorRate: 0,
    timeouts: 0,
    authRejects: 0,
    parseErrors: 0,
    coaLatencyP95: 0,
    elapsedTime: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    networkThroughput: '0 Mbps'
  });

  const [testProgress, setTestProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Mock real-time data
  const [chartData, setChartData] = useState([]);
  const [latencyHistogram, setLatencyHistogram] = useState([]);
  const [errorBreakdown, setErrorBreakdown] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  
  // Predefined scale points from PRD
  const scalePoints = [150, 200, 300, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 10000, 50000, 100000];

  const trafficTypes = ['RADIUS', 'TACACS+', 'Syslog', 'pxGrid'];
  const authTypes = ['EAP-TLS', 'MAB', 'PEAP', '802.1X', 'PAP', 'CHAP', 'MS-CHAPv2', 'EAP-MD5', 'EAP-TTLS', 'EAP-FAST', 'EAP-PWD'];
  const rpsProfiles = ['Constant', 'Incremental', 'Step', 'Ramp', 'Burst'];
  const targetTypes = ['Access Manager', 'Cisco ISE', 'FreeRADIUS', 'Microsoft NPS'];

  // Generate incremental RPS steps
  const generateRpsSteps = () => {
    if (trafficConfig.rpsProfile !== 'Incremental') return [];
    
    const steps = [];
    const rpsIncrement = (trafficConfig.endRps - trafficConfig.startRps) / trafficConfig.rampSteps;
    
    for (let i = 0; i <= trafficConfig.rampSteps; i++) {
      const rps = trafficConfig.startRps + (rpsIncrement * i);
      steps.push({
        step: i + 1,
        rps: Math.round(rps),
        duration: trafficConfig.stepDuration,
        status: i === currentStep ? 'active' : i < currentStep ? 'completed' : 'pending'
      });
    }
    
    return steps;
  };

  const rpsSteps = generateRpsSteps();

  useEffect(() => {
    let interval;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        // Simulate test progress
        const now = Date.now();
        const targetRps = rpsSteps[currentStep]?.rps || trafficConfig.startRps;
        const currentRps = targetRps * (0.95 + Math.random() * 0.1);
        
        const newDataPoint = {
          time: new Date(now).toLocaleTimeString(),
          rps: currentRps,
          targetRps: targetRps,
          latencyP50: 15 + (currentRps / 100) + Math.random() * 5,
          latencyP95: 25 + (currentRps / 80) + Math.random() * 10,
          latencyP99: 35 + (currentRps / 60) + Math.random() * 15,
          errors: Math.max(0, (currentRps / 1000) * Math.random() * 2),
          successRate: Math.max(95, 100 - (currentRps / 10000) * 5)
        };
        
        setChartData(prev => [...prev.slice(-59), newDataPoint]);
        
        // Update latency histogram
        setLatencyHistogram([
          { range: '0-10ms', count: Math.floor(Math.random() * 100 + 50) },
          { range: '10-25ms', count: Math.floor(Math.random() * 200 + 150) },
          { range: '25-50ms', count: Math.floor(Math.random() * 150 + 100) },
          { range: '50-100ms', count: Math.floor(Math.random() * 80 + 40) },
          { range: '100-200ms', count: Math.floor(Math.random() * 40 + 20) },
          { range: '200ms+', count: Math.floor(Math.random() * 20 + 5) }
        ]);
        
        // Update error breakdown
        const totalErrors = newDataPoint.errors;
        setErrorBreakdown([
          { type: 'Timeouts', value: totalErrors * 0.4, color: '#d32f2f' },
          { type: 'Auth Rejects', value: totalErrors * 0.3, color: '#f57c00' },
          { type: 'Parse Errors', value: totalErrors * 0.2, color: '#fbc02d' },
          { type: 'Network', value: totalErrors * 0.1, color: '#9e9e9e' }
        ]);
        
        // Generate log entries
        if (Math.random() > 0.7) {
          const logTypes = [
            { level: 'INFO', message: `Processing ${Math.round(currentRps)} requests per second` },
            { level: 'INFO', message: `Connected to ${target.type} at ${target.host}:${target.port}` },
            { level: 'WARNING', message: `High latency detected: p99=${newDataPoint.latencyP99.toFixed(1)}ms` },
            { level: 'ERROR', message: `Authentication failed for user testuser${Math.floor(Math.random() * 100)}` },
            { level: 'INFO', message: `Scale point ${targetRps} RPS achieved successfully` },
            { level: 'INFO', message: `Active socket count: ${Math.floor(currentRps / 20)}` }
          ];
          
          const randomLog = logTypes[Math.floor(Math.random() * logTypes.length)];
          setLogs(prev => [...prev.slice(-99), {
            timestamp: new Date().toISOString(),
            ...randomLog
          }]);
        }
        
        // Update KPIs
        setLiveKpis(prev => ({
          ...prev,
          currentRps: currentRps,
          targetRps: targetRps,
          deliveredPercent: (currentRps / targetRps) * 100,
          tps: currentRps * 2.5, // Approximate TPS based on auth + accounting
          activeSockets: Math.floor(currentRps / 20),
          latencyP50: newDataPoint.latencyP50,
          latencyP95: newDataPoint.latencyP95,
          latencyP99: newDataPoint.latencyP99,
          successRate: newDataPoint.successRate,
          errorRate: (100 - newDataPoint.successRate),
          timeouts: totalErrors * 0.4,
          authRejects: totalErrors * 0.3,
          parseErrors: totalErrors * 0.2,
          coaLatencyP95: 1200 + Math.random() * 500,
          elapsedTime: prev.elapsedTime + 1,
          cpuUsage: Math.min(85, 20 + (currentRps / 100)),
          memoryUsage: Math.min(75, 30 + (currentRps / 200)),
          networkThroughput: `${(currentRps * 0.008).toFixed(1)} Gbps`
        }));
        
        // Simulate step progression
        const stepProgress = ((liveKpis.elapsedTime % trafficConfig.stepDuration) / trafficConfig.stepDuration) * 100;
        if (stepProgress > 95 && currentStep < rpsSteps.length - 1) {
          setCurrentStep(prev => prev + 1);
        }
        
        setTestProgress((liveKpis.elapsedTime / trafficConfig.duration) * 100);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused, currentStep, rpsSteps.length, trafficConfig, target, liveKpis.elapsedTime]);

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
    setTestProgress(0);
    setCurrentStep(0);
    setChartData([]);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTestProgress(0);
    setCurrentStep(0);
  };

  const handleSavePreset = () => {
    // TODO: Save current configuration as preset
    alert('Preset saved successfully!');
  };

  const handleExportResults = () => {
    // TODO: Export test results
    alert('Results exported successfully!');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const KpiCard = ({ title, value, subtitle, icon: Icon, color = 'primary', trend }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 600, mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: `${color}.main`,
              color: 'white',
            }}
          >
            <Icon sx={{ fontSize: 24 }} />
          </Box>
        </Box>
        {trend && (
          <LinearProgress
            variant="determinate"
            value={trend}
            sx={{ mt: 2, height: 4, borderRadius: 2 }}
            color={color}
          />
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
            Scale Test (RPS Planner)
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Drive controlled and incremental RPS at targets to validate scaling limits
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<SaveIcon />} onClick={handleSavePreset}>
            Save Preset
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportResults}>
            Export Results
          </Button>
        </Box>
      </Box>

      {/* Test Status */}
      {isRunning && (
        <Alert 
          severity={isPaused ? "warning" : "info"} 
          sx={{ mb: 3 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" onClick={handlePause}>
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button size="small" color="error" onClick={handleStop}>
                Stop
              </Button>
            </Box>
          }
        >
          Test {isPaused ? 'paused' : 'running'} - Step {currentStep + 1} of {rpsSteps.length} - 
          Elapsed: {formatTime(liveKpis.elapsedTime)}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Configuration
              </Typography>
              
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">Target Server</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth>
                      <InputLabel>Server Type</InputLabel>
                      <Select
                        value={target.type}
                        label="Server Type"
                        onChange={(e) => setTarget({...target, type: e.target.value})}
                      >
                        {targetTypes.map(type => (
                          <MenuItem key={type} value={type}>
                            {type}
                            {type === 'Access Manager' && (
                              <Chip label="PRIMARY" size="small" color="primary" sx={{ ml: 1, height: 18 }} />
                            )}
                            {type === 'Cisco ISE' && (
                              <Chip label="OPTIONAL" size="small" variant="outlined" sx={{ ml: 1, height: 18 }} />
                            )}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <TextField
                      label="Host/IP Address"
                      value={target.host}
                      onChange={(e) => setTarget({...target, host: e.target.value})}
                      fullWidth
                    />
                    
                    <TextField
                      label="Port"
                      type="number"
                      value={target.port}
                      onChange={(e) => setTarget({...target, port: parseInt(e.target.value)})}
                      fullWidth
                    />
                    
                    <TextField
                      label="Shared Secret"
                      type="password"
                      value={target.secret}
                      onChange={(e) => setTarget({...target, secret: e.target.value})}
                      fullWidth
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">Traffic Profile</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth>
                      <InputLabel>Traffic Type</InputLabel>
                      <Select
                        value={trafficConfig.type}
                        label="Traffic Type"
                        onChange={(e) => setTrafficConfig({...trafficConfig, type: e.target.value})}
                      >
                        {trafficTypes.map(type => (
                          <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth>
                      <InputLabel>Auth Type</InputLabel>
                      <Select
                        value={trafficConfig.authType}
                        label="Auth Type"
                        onChange={(e) => setTrafficConfig({...trafficConfig, authType: e.target.value})}
                      >
                        {authTypes.map(type => (
                          <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth>
                      <InputLabel>RPS Profile</InputLabel>
                      <Select
                        value={trafficConfig.rpsProfile}
                        label="RPS Profile"
                        onChange={(e) => setTrafficConfig({...trafficConfig, rpsProfile: e.target.value})}
                      >
                        {rpsProfiles.map(profile => (
                          <MenuItem key={profile} value={profile}>{profile}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    {trafficConfig.rpsProfile === 'Incremental' && (
                      <>
                        <FormControl fullWidth>
                          <InputLabel>Start RPS</InputLabel>
                          <Select
                            value={trafficConfig.startRps}
                            label="Start RPS"
                            onChange={(e) => setTrafficConfig({...trafficConfig, startRps: e.target.value})}
                          >
                            {scalePoints.filter(p => p <= 5000).map(point => (
                              <MenuItem key={point} value={point}>{point.toLocaleString()}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        
                        <FormControl fullWidth>
                          <InputLabel>End RPS</InputLabel>
                          <Select
                            value={trafficConfig.endRps}
                            label="End RPS"
                            onChange={(e) => setTrafficConfig({...trafficConfig, endRps: e.target.value})}
                          >
                            {scalePoints.map(point => (
                              <MenuItem key={point} value={point}>{point.toLocaleString()}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        
                        <TextField
                          label="Ramp Steps"
                          type="number"
                          value={trafficConfig.rampSteps}
                          onChange={(e) => setTrafficConfig({...trafficConfig, rampSteps: parseInt(e.target.value)})}
                          fullWidth
                          helperText="Number of incremental steps (recommended: 5-20)"
                        />
                        <TextField
                          label="Step Duration (seconds)"
                          type="number"
                          value={trafficConfig.stepDuration}
                          onChange={(e) => setTrafficConfig({...trafficConfig, stepDuration: parseInt(e.target.value)})}
                          fullWidth
                          helperText="Duration for each RPS level"
                        />
                      </>
                    )}
                    
                    <TextField
                      label="Total Duration (seconds)"
                      type="number"
                      value={trafficConfig.duration}
                      onChange={(e) => setTrafficConfig({...trafficConfig, duration: parseInt(e.target.value)})}
                      fullWidth
                    />
                    
                    <TextField
                      label="Concurrent Clients"
                      type="number"
                      value={trafficConfig.clients}
                      onChange={(e) => setTrafficConfig({...trafficConfig, clients: parseInt(e.target.value)})}
                      fullWidth
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={trafficConfig.accounting}
                          onChange={(e) => setTrafficConfig({...trafficConfig, accounting: e.target.checked})}
                        />
                      }
                      label="Enable Accounting"
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* RPS Steps Preview */}
              {trafficConfig.rpsProfile === 'Incremental' && rpsSteps.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">RPS Steps Preview</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stepper orientation="vertical" activeStep={currentStep}>
                      {rpsSteps.map((step, index) => (
                        <Step key={index}>
                          <StepLabel>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">
                                Step {step.step}: {step.rps} RPS
                              </Typography>
                              {step.status === 'active' && (
                                <Chip label="Active" size="small" color="primary" />
                              )}
                              {step.status === 'completed' && (
                                <Chip label="✓" size="small" color="success" />
                              )}
                            </Box>
                          </StepLabel>
                          <StepContent>
                            <Typography variant="caption" color="text.secondary">
                              Duration: {step.duration}s
                            </Typography>
                          </StepContent>
                        </Step>
                      ))}
                    </Stepper>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Control Buttons */}
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                {!isRunning ? (
                  <Button
                    variant="contained"
                    startIcon={<PlayIcon />}
                    onClick={handleStart}
                    fullWidth
                    size="large"
                  >
                    Start Test
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={isPaused ? <PlayIcon /> : <PauseIcon />}
                      onClick={handlePause}
                      fullWidth
                    >
                      {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<StopIcon />}
                      onClick={handleStop}
                      fullWidth
                    >
                      Stop
                    </Button>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Live Metrics and Charts */}
        <Grid item xs={12} lg={8}>
          {/* KPI Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <KpiCard
                title="Current RPS"
                value={Math.round(liveKpis.currentRps).toLocaleString()}
                icon={SpeedIcon}
                color="primary"
                trend={liveKpis.deliveredPercent}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                title="Target RPS"
                value={liveKpis.targetRps.toLocaleString()}
                icon={TrendingUpIcon}
                color="success"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                title="Latency p95"
                value={`${Math.round(liveKpis.latencyP95)}ms`}
                icon={TimeIcon}
                color="warning"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                title="Success Rate"
                value={`${liveKpis.successRate.toFixed(1)}%`}
                icon={SecurityIcon}
                color="info"
              />
            </Grid>
          </Grid>

          {/* Real-time Charts */}
          <Grid container spacing={3}>
            {/* Enhanced Performance Chart */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Real-time Performance Metrics
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Chip 
                        label={`Current: ${Math.round(liveKpis.currentRps).toLocaleString()} RPS`} 
                        color="primary" 
                        variant="outlined"
                      />
                      <Chip 
                        label={`Target: ${liveKpis.targetRps.toLocaleString()} RPS`} 
                        color="success" 
                        variant="outlined"
                      />
                      <Chip 
                        label={`TPS: ${Math.round(liveKpis.tps).toLocaleString()}`} 
                        color="info" 
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis 
                          dataKey="time" 
                          stroke="#666"
                          style={{ fontSize: 12 }}
                        />
                        <YAxis 
                          yAxisId="left" 
                          stroke="#1565C0"
                          label={{ value: 'Requests per Second', angle: -90, position: 'insideLeft', style: { fill: '#1565C0' } }}
                        />
                        <YAxis 
                          yAxisId="right" 
                          orientation="right" 
                          stroke="#2E7D32"
                          label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight', style: { fill: '#2E7D32' } }}
                        />
                        <RechartsTooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: '1px solid #ccc',
                            borderRadius: 8
                          }}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="rps"
                          stroke="#1565C0"
                          strokeWidth={3}
                          dot={false}
                          name="Current RPS"
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="targetRps"
                          stroke="#1565C0"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Target RPS"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="latencyP50"
                          stroke="#4CAF50"
                          strokeWidth={2}
                          dot={false}
                          name="p50 Latency"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="latencyP95"
                          stroke="#FF9800"
                          strokeWidth={2}
                          dot={false}
                          name="p95 Latency"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="latencyP99"
                          stroke="#f44336"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          dot={false}
                          name="p99 Latency"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                  
                  {/* SLO Indicators */}
                  <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Alert 
                      severity={liveKpis.latencyP95 < 150 ? 'success' : liveKpis.latencyP95 < 300 ? 'warning' : 'error'}
                      sx={{ flexGrow: 1 }}
                    >
                      <Typography variant="caption">
                        SLO: p95 Latency {liveKpis.latencyP95 < 150 ? '✓ Met' : '✗ Exceeded'} (Target: &lt;150ms, Current: {Math.round(liveKpis.latencyP95)}ms)
                      </Typography>
                    </Alert>
                    <Alert 
                      severity={liveKpis.errorRate < 1 ? 'success' : liveKpis.errorRate < 5 ? 'warning' : 'error'}
                      sx={{ flexGrow: 1 }}
                    >
                      <Typography variant="caption">
                        SLO: Error Rate {liveKpis.errorRate < 1 ? '✓ Met' : '✗ Exceeded'} (Target: &lt;1%, Current: {liveKpis.errorRate.toFixed(2)}%)
                      </Typography>
                    </Alert>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Latency Histogram */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Latency Distribution
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={latencyHistogram} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="range" angle={-45} textAnchor="end" height={60} />
                        <YAxis label={{ value: 'Request Count', angle: -90, position: 'insideLeft' }} />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#1565C0">
                          {latencyHistogram.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={
                              index <= 1 ? '#4CAF50' : 
                              index <= 3 ? '#FF9800' : 
                              '#f44336'
                            } />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                  <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Chip icon={<Box sx={{ width: 12, height: 12, bgcolor: '#4CAF50', borderRadius: '50%' }} />} label="Good" size="small" />
                    <Chip icon={<Box sx={{ width: 12, height: 12, bgcolor: '#FF9800', borderRadius: '50%' }} />} label="Acceptable" size="small" />
                    <Chip icon={<Box sx={{ width: 12, height: 12, bgcolor: '#f44336', borderRadius: '50%' }} />} label="Poor" size="small" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Error Breakdown */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Error Classification
                  </Typography>
                  <Box sx={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={errorBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ type, value }) => `${type}: ${value.toFixed(1)}%`}
                        >
                          {errorBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Timeouts:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{liveKpis.timeouts.toFixed(1)}%</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Auth Rejects:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{liveKpis.authRejects.toFixed(1)}%</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Parse Errors:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{liveKpis.parseErrors.toFixed(1)}%</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">CoA p95:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{Math.round(liveKpis.coaLatencyP95)}ms</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* System Resources */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    System Resources
                  </Typography>
                  <Box sx={{ mt: 3 }}>
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">CPU Usage</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{liveKpis.cpuUsage.toFixed(1)}%</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={liveKpis.cpuUsage} 
                        color={liveKpis.cpuUsage < 60 ? 'primary' : liveKpis.cpuUsage < 80 ? 'warning' : 'error'}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Memory Usage</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{liveKpis.memoryUsage.toFixed(1)}%</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={liveKpis.memoryUsage} 
                        color={liveKpis.memoryUsage < 60 ? 'success' : liveKpis.memoryUsage < 80 ? 'warning' : 'error'}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    
                    <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                      <Typography variant="caption" color="text.secondary">Network Throughput</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {liveKpis.networkThroughput}
                      </Typography>
                    </Paper>
                    
                    <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary">Active Sockets</Typography>
                        <Typography variant="h6">{liveKpis.activeSockets}</Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary">TPS</Typography>
                        <Typography variant="h6">{Math.round(liveKpis.tps).toLocaleString()}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Test Progress */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Test Execution Progress
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Overall Progress</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{Math.round(testProgress)}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={testProgress} 
                      sx={{ mb: 3, height: 10, borderRadius: 5 }}
                      color={testProgress < 50 ? 'primary' : testProgress < 80 ? 'success' : 'warning'}
                    />
                    
                    {isRunning && (
                      <>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Elapsed Time</Typography>
                            <Typography variant="h6">{formatTime(liveKpis.elapsedTime)}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Remaining</Typography>
                            <Typography variant="h6">{formatTime(trafficConfig.duration - liveKpis.elapsedTime)}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Current Step</Typography>
                            <Typography variant="h6">{currentStep + 1} / {rpsSteps.length}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Delivery Rate</Typography>
                            <Typography variant="h6">{liveKpis.deliveredPercent.toFixed(1)}%</Typography>
                          </Grid>
                        </Grid>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Box>
                          <Typography variant="caption" color="text.secondary">Next Scale Point</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {rpsSteps[currentStep + 1]?.rps.toLocaleString() || 'Complete'} RPS
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Live Logs Panel */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Live Test Logs
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
                      backgroundColor: '#1e1e1e',
                      '& pre': {
                        margin: 0,
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '12px',
                        lineHeight: 1.5
                      }
                    }}
                  >
                    {logs.length === 0 ? (
                      <Typography variant="body2" sx={{ color: '#666', fontFamily: 'monospace' }}>
                        No logs yet. Start a test to see live logs...
                      </Typography>
                    ) : (
                      logs.map((log, index) => (
                        <Box key={index} sx={{ mb: 0.5 }}>
                          <pre style={{ 
                            color: log.level === 'ERROR' ? '#f44336' : 
                                   log.level === 'WARNING' ? '#ff9800' : 
                                   '#4caf50'
                          }}>
                            [{log.timestamp}] [{log.level}] {log.message}
                          </pre>
                        </Box>
                      ))
                    )}
                  </Paper>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ScaleTest;
