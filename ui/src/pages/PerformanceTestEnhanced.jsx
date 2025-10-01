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
  Paper,
  Slider,
  Checkbox,
  FormGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Download as DownloadIcon,
  CompareArrows as CompareIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon,
  Assessment as AssessmentIcon,
  BugReport as BugIcon,
} from '@mui/icons-material';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

const PerformanceTestEnhanced = () => {
  const [sloConfig, setSloConfig] = useState({
    authP95: 150,
    authP99: 300,
    errorRate: 1,
    coaP95: 2000,
    custom: false
  });

  const [workloadMix, setWorkloadMix] = useState({
    'EAP-TLS': 35,
    'MAB': 30,
    'PEAP': 20,
    '802.1X': 10,
    'PAP': 5,
  });

  const [selectedScalePoints, setSelectedScalePoints] = useState([1000, 5000, 10000]);
  const [testConfig, setTestConfig] = useState({
    warmupPeriod: 30,
    cooldownPeriod: 30,
    trialCount: 3,
    confidenceTarget: 95,
    target: 'Access Manager',
    targetHost: '192.168.1.10'
  });

  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [baselineRun, setBaselineRun] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(true);

  // Predefined scale points from PRD
  const scalePoints = [150, 200, 300, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 10000, 50000, 100000];

  const defaultSlos = [
    { name: 'Default SLOs', authP95: 150, authP99: 300, errorRate: 1, coaP95: 2000 },
    { name: 'Strict SLOs', authP95: 100, authP99: 200, errorRate: 0.5, coaP95: 1500 },
    { name: 'Relaxed SLOs', authP95: 250, authP99: 500, errorRate: 2, coaP95: 3000 }
  ];

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        generateLogEntry();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  const generateLogEntry = () => {
  };

  const handleSloSetChange = (sloSet) => {
    setSloConfig({
      ...sloSet,
      custom: false
    });
  };

  const handleWorkloadMixChange = (authType, value) => {
    const newMix = { ...workloadMix };
    newMix[authType] = value;
    
    // Normalize to 100%
    const total = Object.values(newMix).reduce((sum, val) => sum + val, 0);
    if (total > 0) {
      Object.keys(newMix).forEach(key => {
        newMix[key] = Math.round((newMix[key] / total) * 100);
      });
    }
    
    setWorkloadMix(newMix);
  };

  const handleScalePointToggle = (point) => {
    setSelectedScalePoints(prev => 
      prev.includes(point) 
        ? prev.filter(p => p !== point)
        : [...prev, point].sort((a, b) => a - b)
    );
  };

  const handleStartBenchmark = () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentTest({ phase: 'Warming up', scalePoint: selectedScalePoints[0], trial: 1 });
    setLogs([]);
    
    // Simulate test execution
    simulateTestExecution();
  };

  const simulateTestExecution = () => {
    let testIndex = 0;
    const interval = setInterval(() => {
      if (testIndex < selectedScalePoints.length) {
        const scalePoint = selectedScalePoints[testIndex];
        setCurrentTest({ 
          phase: 'Running', 
          scalePoint, 
          trial: 1,
          totalTrials: testConfig.trialCount,
          progress: (testIndex / selectedScalePoints.length) * 100
        });
        
        setTimeout(async () => {
          const result = await generateRealResult(scalePoint);
          setTestResults(prev => [...prev, result]);
          testIndex++;
          
          if (testIndex >= selectedScalePoints.length) {
            clearInterval(interval);
            setIsRunning(false);
            setCurrentTest(null);
            generateLogEntry();
          }
        }, 3000);
      }
    }, 4000);
  };

  const generateRealResult = async (scalePoint) => {
    try {
      const response = await fetch('/api/performance/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scalePoint,
          sloConfig,
          workloadMix,
          testConfig
        })
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error('Performance test failed');
      }
    } catch (error) {
      console.error('Error running performance test:', error);
      return {
        scalePoint,
        authP95: 0,
        authP99: 0,
        errorRate: 100,
        coaP95: 0,
        slosPassed: {
          authP95: false,
          authP99: false,
          errorRate: false,
          coaP95: false
        },
        passed: false,
        bottleneck: 'Test execution failed',
        timestamp: new Date().toISOString(),
        cpuUsage: 0,
        memoryUsage: 0,
        networkUtilization: 0,
        error: error.message
      };
    }
  };

  const getWorkloadTotal = () => {
    return Object.values(workloadMix).reduce((sum, val) => sum + val, 0);
  };

  const getLogIcon = (level) => {
    switch(level) {
      case 'ERROR': return <ErrorIcon sx={{ color: 'error.main', fontSize: 16 }} />;
      case 'WARNING': return <WarningIcon sx={{ color: 'warning.main', fontSize: 16 }} />;
      case 'SUCCESS': return <CheckIcon sx={{ color: 'success.main', fontSize: 16 }} />;
      default: return <InfoIcon sx={{ color: 'info.main', fontSize: 16 }} />;
    }
  };

  const getLogColor = (level) => {
    switch(level) {
      case 'ERROR': return 'error.main';
      case 'WARNING': return 'warning.main';
      case 'SUCCESS': return 'success.main';
      default: return 'text.secondary';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Performance Test (SLO Benchmark)
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Repeatable benchmark suite to validate SLOs & detect regressions against {testConfig.target}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<CompareIcon />} disabled={!baselineRun}>
            Compare Baseline
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} disabled={testResults.length === 0}>
            Export Report
          </Button>
        </Box>
      </Box>

      {/* Current Test Status */}
      {currentTest && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          icon={<SpeedIcon />}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {currentTest.phase} - {currentTest.scalePoint?.toLocaleString()} RPS
            </Typography>
            <Typography variant="body2">
              Trial {currentTest.trial} of {currentTest.totalTrials}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={currentTest.progress || 0} 
              sx={{ mt: 1, height: 6, borderRadius: 3 }}
            />
          </Box>
        </Alert>
      )}

      {/* Configuration Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="SLO Configuration" />
          <Tab label="Workload Mix" />
          <Tab label="Test Settings" />
          <Tab label="Results" disabled={testResults.length === 0} />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  SLO Configuration
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  {defaultSlos.map((sloSet, index) => (
                    <Button
                      key={index}
                      variant={!sloConfig.custom && sloConfig.authP95 === sloSet.authP95 ? 'contained' : 'outlined'}
                      onClick={() => handleSloSetChange(sloSet)}
                      sx={{ textTransform: 'none' }}
                    >
                      {sloSet.name}
                    </Button>
                  ))}
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="Auth p95 (ms)"
                      type="number"
                      value={sloConfig.authP95}
                      onChange={(e) => setSloConfig({...sloConfig, authP95: parseInt(e.target.value), custom: true})}
                      fullWidth
                      InputProps={{
                        endAdornment: <Typography variant="caption">ms</Typography>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="Auth p99 (ms)"
                      type="number"
                      value={sloConfig.authP99}
                      onChange={(e) => setSloConfig({...sloConfig, authP99: parseInt(e.target.value), custom: true})}
                      fullWidth
                      InputProps={{
                        endAdornment: <Typography variant="caption">ms</Typography>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="Error Rate (%)"
                      type="number"
                      value={sloConfig.errorRate}
                      onChange={(e) => setSloConfig({...sloConfig, errorRate: parseFloat(e.target.value), custom: true})}
                      fullWidth
                      inputProps={{ step: 0.1 }}
                      InputProps={{
                        endAdornment: <Typography variant="caption">%</Typography>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="CoA p95 (ms)"
                      type="number"
                      value={sloConfig.coaP95}
                      onChange={(e) => setSloConfig({...sloConfig, coaP95: parseInt(e.target.value), custom: true})}
                      fullWidth
                      InputProps={{
                        endAdornment: <Typography variant="caption">ms</Typography>
                      }}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Scale Points Selection
                </Typography>
                
                <FormGroup row>
                  {scalePoints.map(point => (
                    <FormControlLabel
                      key={point}
                      control={
                        <Checkbox
                          checked={selectedScalePoints.includes(point)}
                          onChange={() => handleScalePointToggle(point)}
                        />
                      }
                      label={`${point.toLocaleString()} RPS`}
                      sx={{ width: '150px' }}
                    />
                  ))}
                </FormGroup>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Workload Mix Configuration
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Alert severity={getWorkloadTotal() !== 100 ? 'warning' : 'success'}>
                    Total: {getWorkloadTotal()}% {getWorkloadTotal() !== 100 && '(Must equal 100%)'}
                  </Alert>
                </Box>
                
                {Object.entries(workloadMix).map(([authType, value]) => (
                  <Box key={authType} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1">{authType}</Typography>
                      <Typography variant="body2" color="text.secondary">{value}%</Typography>
                    </Box>
                    <Slider
                      value={value}
                      onChange={(e, newValue) => handleWorkloadMixChange(authType, newValue)}
                      min={0}
                      max={100}
                      step={5}
                      marks
                      valueLabelDisplay="auto"
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Mix Visualization
                </Typography>
                <Box sx={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={Object.entries(workloadMix).map(([key, value]) => ({ type: key, value }))}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="type" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar name="Workload %" dataKey="value" stroke="#1565C0" fill="#1565C0" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Test Configuration
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Target Server</InputLabel>
                      <Select
                        value={testConfig.target}
                        label="Target Server"
                        onChange={(e) => setTestConfig({...testConfig, target: e.target.value})}
                      >
                        <MenuItem value="Access Manager">Access Manager (Primary)</MenuItem>
                        <MenuItem value="Cisco ISE">Cisco ISE (Optional)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="Target Host"
                      value={testConfig.targetHost}
                      onChange={(e) => setTestConfig({...testConfig, targetHost: e.target.value})}
                      fullWidth
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="Warmup Period (sec)"
                      type="number"
                      value={testConfig.warmupPeriod}
                      onChange={(e) => setTestConfig({...testConfig, warmupPeriod: parseInt(e.target.value)})}
                      fullWidth
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="Cooldown Period (sec)"
                      type="number"
                      value={testConfig.cooldownPeriod}
                      onChange={(e) => setTestConfig({...testConfig, cooldownPeriod: parseInt(e.target.value)})}
                      fullWidth
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="Trial Count"
                      type="number"
                      value={testConfig.trialCount}
                      onChange={(e) => setTestConfig({...testConfig, trialCount: parseInt(e.target.value)})}
                      fullWidth
                      inputProps={{ min: 1, max: 10 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="Confidence Target (%)"
                      type="number"
                      value={testConfig.confidenceTarget}
                      onChange={(e) => setTestConfig({...testConfig, confidenceTarget: parseInt(e.target.value)})}
                      fullWidth
                      inputProps={{ min: 90, max: 99 }}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={isRunning ? <StopIcon /> : <PlayIcon />}
                    onClick={isRunning ? () => setIsRunning(false) : handleStartBenchmark}
                    disabled={getWorkloadTotal() !== 100 || selectedScalePoints.length === 0}
                    sx={{ px: 4 }}
                  >
                    {isRunning ? 'Stop Benchmark' : 'Start Benchmark'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 3 && testResults.length > 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Benchmark Results
                </Typography>
                
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Scale Point</TableCell>
                        <TableCell align="center">Auth p95</TableCell>
                        <TableCell align="center">Auth p99</TableCell>
                        <TableCell align="center">Error Rate</TableCell>
                        <TableCell align="center">CoA p95</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell>Bottleneck</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {testResults.map((result, index) => (
                        <TableRow 
                          key={index}
                          sx={{ backgroundColor: result.passed ? 'success.light' : 'error.light', opacity: 0.1 }}
                        >
                          <TableCell>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {result.scalePoint.toLocaleString()} RPS
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${result.authP95}ms`}
                              size="small"
                              color={result.slosPassed.authP95 ? 'success' : 'error'}
                              icon={result.slosPassed.authP95 ? <CheckIcon /> : <CloseIcon />}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${result.authP99}ms`}
                              size="small"
                              color={result.slosPassed.authP99 ? 'success' : 'error'}
                              icon={result.slosPassed.authP99 ? <CheckIcon /> : <CloseIcon />}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${result.errorRate.toFixed(2)}%`}
                              size="small"
                              color={result.slosPassed.errorRate ? 'success' : 'error'}
                              icon={result.slosPassed.errorRate ? <CheckIcon /> : <CloseIcon />}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${result.coaP95}ms`}
                              size="small"
                              color={result.slosPassed.coaP95 ? 'success' : 'error'}
                              icon={result.slosPassed.coaP95 ? <CheckIcon /> : <CloseIcon />}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={result.passed ? 'PASS' : 'FAIL'}
                              color={result.passed ? 'success' : 'error'}
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            {result.bottleneck ? (
                              <Chip 
                                label={result.bottleneck}
                                size="small"
                                icon={<BugIcon />}
                                variant="outlined"
                                color="warning"
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">None</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Live Logs Panel */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Benchmark Execution Logs
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
              backgroundColor: 'grey.50',
            }}
          >
            {logs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No logs yet. Start a benchmark to see execution logs...
              </Typography>
            ) : (
              <List dense>
                {logs.map((log, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {getLogIcon(log.level)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </Typography>
                          <Typography variant="body2" color={getLogColor(log.level)}>
                            {log.message}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PerformanceTestEnhanced;
