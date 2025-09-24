import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  InputAdornment,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Send as SendIcon,
  CheckCircle as SuccessIcon,
  Cancel as FailIcon,
  Security as SecurityIcon,
  NetworkCheck as NetworkIcon,
  VpnKey as AuthIcon,
  Router as DeviceIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Timer as TimerIcon,
  Assignment as LogIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

const QuickTest = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [testType, setTestType] = useState('mab');
  const [target, setTarget] = useState('asset-manager-primary');
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  const [testConfig, setTestConfig] = useState({
    username: 'testuser001',
    password: '',
    certificate: 'client-cert-01.pem',
    nas_ip: '10.0.1.1',
    nas_secret: 'radius-secret-key',
    timeout: 5,
    retries: 3,
    fragment_size: 1400,
  });

  const [threatConfig, setThreatConfig] = useState({
    type: 'credential-spray',
    intensity: 'medium',
    duration: 30,
    target_users: 100,
  });

  const testTypes = [
    { value: 'eap-tls', label: 'EAP-TLS', description: 'Certificate-based authentication' },
    { value: 'mab', label: 'MAB', description: 'MAC Authentication Bypass' },
    { value: '802.1x', label: '802.1X', description: 'Port-based authentication' },
    { value: 'peap', label: 'PEAP', description: 'Protected EAP with MSCHAPv2' },
    { value: 'pap', label: 'PAP', description: 'Password Authentication Protocol' },
    { value: 'chap', label: 'CHAP', description: 'Challenge Handshake Protocol' },
  ];

  const targets = [
    { value: 'asset-manager-primary', label: 'Asset Manager Primary', ip: '192.168.1.10' },
    { value: 'asset-manager-secondary', label: 'Asset Manager Secondary', ip: '192.168.1.11' },
    { value: 'ise-psn-1', label: 'ISE PSN-1', ip: '192.168.2.10' },
    { value: 'custom', label: 'Custom Target', ip: '' },
  ];

  const threatTypes = [
    { value: 'credential-spray', label: 'Credential Spray', icon: <AuthIcon /> },
    { value: 'protocol-fuzz', label: 'Protocol Fuzzing', icon: <SecurityIcon /> },
    { value: 'burst-storm', label: 'Burst Storm', icon: <NetworkIcon /> },
    { value: 'downgrade-attack', label: 'Downgrade Attack', icon: <FailIcon /> },
  ];

  const handleRunTest = () => {
    setRunning(true);
    
    // Simulate test execution
    setTimeout(() => {
      const result = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: testType,
        target: target,
        status: Math.random() > 0.2 ? 'success' : 'failed',
        latency: Math.floor(Math.random() * 50) + 10,
        details: generateTestDetails(testType),
      };
      
      setTestResults([result, ...testResults.slice(0, 9)]);
      setRunning(false);
    }, 2000);
  };

  const generateTestDetails = (type) => {
    const templates = {
      'eap-tls': {
        request: 'Access-Request',
        response: 'Access-Accept',
        status: Math.random() > 0.1 ? 'Valid Auth' : 'Invalid Auth',
        attributes: [
          'Code = Access-Request (1)',
          'Identifier = 123',
          'Length = 268',
          'Authenticator = 0x1a2b3c4d5e6f7890abcdef1234567890',
          'User-Name = "testuser001"',
          'NAS-IP-Address = 10.0.1.1',
          'NAS-Port = 50001',
          'Called-Station-Id = "00-11-22-33-44-55:RadiusForge"',
          'Calling-Station-Id = "AA-BB-CC-DD-EE-FF"',
          'Framed-MTU = 1400',
          'NAS-Port-Type = Ethernet',
          'Connect-Info = "CONNECT 1000Mbps Ethernet"',
          'EAP-Message = 0x0201003f15...',
          'Message-Authenticator = 0xabcdef1234567890...',
          'State = 0x1234567890abcdef...'
        ],
        vsa: [
          'Vendor-Specific (26)',
          '  Vendor-Id = Cisco (9)',
          '  Cisco-AVPair = "audit-session-id=0A0001010000012345678900"',
          '  Cisco-AVPair = "profile-name=Employee-Access"',
          '  Cisco-AVPair = "device-type=Windows-Workstation"',
          '  Cisco-AVPair = "device-platform=win10-x64"',
          '  Cisco-AVPair = "posture-status=compliant"',
          '  Cisco-AVPair = "cts:security-group-tag=0004-00"',
          'Filter-Id = "ACL-EMPLOYEE-ACCESS"',
          'Tunnel-Type = VLAN',
          'Tunnel-Medium-Type = IEEE-802',
          'Tunnel-Private-Group-Id = "100"',
          'Session-Timeout = 28800',
          'Termination-Action = RADIUS-Request'
        ],
        rawPacket: '01 7B 01 0C 1A 2B 3C 4D 5E 6F 78 90 AB CD EF 12\n34 56 78 90 01 0C 74 65 73 74 75 73 65 72 30 30\n31 04 06 0A 00 01 01 05 06 00 00 C3 51...'
      },
      'mab': {
        request: 'Access-Request',
        response: 'Access-Accept',
        status: 'Valid Auth',
        attributes: [
          'Code = Access-Request (1)',
          'Identifier = 45',
          'Length = 124',
          'Authenticator = 0xfedcba0987654321fedcba0987654321',
          'User-Name = "001122334455"',
          'User-Password = [encrypted]',
          'NAS-IP-Address = 10.0.1.1',
          'NAS-Port = 50123',
          'NAS-Port-Type = Ethernet',
          'Calling-Station-Id = "00-11-22-33-44-55"',
          'Called-Station-Id = "AA-BB-CC-DD-EE-FF"',
          'Service-Type = Call-Check',
          'Framed-MTU = 1500',
          'Message-Authenticator = 0x1234567890abcdef...'
        ],
        vsa: [
          'Vendor-Specific (26)',
          '  Vendor-Id = Cisco (9)',
          '  Cisco-AVPair = "audit-session-id=0A0001010000056789ABCDEF"',
          '  Cisco-AVPair = "device-traffic-class=voice"',
          '  Cisco-AVPair = "device-type=Cisco-IP-Phone"',
          '  Cisco-AVPair = "device-name=SEP001122334455"',
          '  Cisco-AVPair = "interface-template=VOICE_VLAN_TEMPLATE"',
          'Filter-Id = "ACL-VOICE-DEVICE"',
          'Tunnel-Type = VLAN',
          'Tunnel-Medium-Type = IEEE-802',
          'Tunnel-Private-Group-Id = "20"',
          'Class = "CACS:0A0001010000056789ABCDEF:ISE01/123456789/12345"'
        ],
        rawPacket: '01 2D 00 7C FE DC BA 09 87 65 43 21 FE DC BA 09\n87 65 43 21 01 0E 30 30 31 31 32 32 33 33 34 34\n35 35 02 12 [encrypted data]...'
      },
      '802.1x': {
        request: 'Access-Request',
        response: 'Access-Accept',
        status: 'Valid Auth',
        attributes: [
          'Code = Access-Request (1)',
          'Identifier = 89',
          'Length = 312',
          'Authenticator = 0xaabbccddaabbccddaabbccddaabbccdd',
          'User-Name = "host/WORKSTATION001.corp.local"',
          'NAS-IP-Address = 10.0.2.1',
          'NAS-Port = 50001',
          'NAS-Port-Id = "GigabitEthernet1/0/1"',
          'NAS-Port-Type = Ethernet',
          'Called-Station-Id = "00-1A-2B-3C-4D-5E"',
          'Calling-Station-Id = "11-22-33-44-55-66"',
          'Framed-MTU = 1500',
          'EAP-Message = 0x020100a01980...',
          'State = 0xabcdef123456...',
          'Message-Authenticator = 0x987654321...'
        ],
        vsa: [
          'Vendor-Specific (26)',
          '  Vendor-Id = Cisco (9)',
          '  Cisco-AVPair = "audit-session-id=0A00020100000ABCDEF12345"',
          '  Cisco-AVPair = "posture-status=compliant"',
          '  Cisco-AVPair = "device-platform=win10-enterprise"',
          '  Cisco-AVPair = "cts:security-group-tag=0004-00"',
          '  Cisco-AVPair = "cts:environment-data=S:Corp-Network"',
          'Class = "CACS:0A00020100000ABCDEF12345:ISE02/987654321/54321"',
          'Session-Timeout = 3600',
          'Termination-Action = RADIUS-Request',
          'Tunnel-Type = VLAN',
          'Tunnel-Medium-Type = IEEE-802',
          'Tunnel-Private-Group-Id = "100"'
        ],
        rawPacket: '01 59 01 38 AA BB CC DD AA BB CC DD AA BB CC DD\nAA BB CC DD 01 20 68 6F 73 74 2F 57 4F 52 4B 53\n54 41 54 49 4F 4E 30 30 31...'
      },
      'peap': {
        request: 'Access-Request',
        response: 'Access-Accept',
        status: 'Valid Auth',
        attributes: [
          'Code = Access-Request (1)',
          'Identifier = 67',
          'Length = 245',
          'User-Name = "john.doe@corp.local"',
          'NAS-IP-Address = 10.0.3.1',
          'NAS-Port-Type = Wireless-802.11',
          'Called-Station-Id = "00-11-22-33-44-55:Corp-WiFi"',
          'EAP-Message = 0x0201004519...',
          'Message-Authenticator = 0xdeadbeef...'
        ],
        vsa: [
          'Cisco-AVPair = "profile-name=Corporate-WiFi"',
          'Cisco-AVPair = "device-type=Mobile"',
          'Tunnel-Type = VLAN',
          'Tunnel-Private-Group-Id = "200"'
        ],
        rawPacket: '01 43 00 F5...'
      }
    };
    
    return templates[type] || templates['eap-tls'];
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const exportResults = () => {
    const data = JSON.stringify(testResults, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quick-test-results-${Date.now()}.json`;
    a.click();
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Quick Test
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Validate specific authentication types and threat scenarios instantly
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            onClick={exportResults}
            disabled={testResults.length === 0}
          >
            Export Results
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={() => setTestResults([])}
          >
            Clear
          </Button>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Authentication Test" icon={<AuthIcon />} iconPosition="start" />
        <Tab label="Threat Simulation" icon={<SecurityIcon />} iconPosition="start" />
        <Tab label="Batch Test" icon={<LogIcon />} iconPosition="start" />
      </Tabs>

      {/* Authentication Test Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Test Configuration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Test Configuration
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Authentication Type</InputLabel>
                    <Select
                      value={testType}
                      onChange={(e) => setTestType(e.target.value)}
                      label="Authentication Type"
                    >
                      {testTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          <Box>
                            <Typography variant="body1">{type.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {type.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Target Server</InputLabel>
                    <Select
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      label="Target Server"
                    >
                      {targets.map((t) => (
                        <MenuItem key={t.value} value={t.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography>{t.label}</Typography>
                            {t.ip && (
                              <Chip label={t.ip} size="small" variant="outlined" />
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Divider sx={{ my: 2 }} />

                  {testType === 'eap-tls' && (
                    <>
                      <TextField
                        fullWidth
                        label="Username"
                        value={testConfig.username}
                        onChange={(e) => setTestConfig({...testConfig, username: e.target.value})}
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        label="Certificate File"
                        value={testConfig.certificate}
                        onChange={(e) => setTestConfig({...testConfig, certificate: e.target.value})}
                        sx={{ mb: 2 }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Button size="small">Browse</Button>
                            </InputAdornment>
                          ),
                        }}
                      />
                      <TextField
                        fullWidth
                        label="Fragment Size"
                        type="number"
                        value={testConfig.fragment_size}
                        onChange={(e) => setTestConfig({...testConfig, fragment_size: e.target.value})}
                        sx={{ mb: 2 }}
                      />
                    </>
                  )}

                  {testType === 'mab' && (
                    <>
                      <TextField
                        fullWidth
                        label="MAC Address"
                        value="00:11:22:33:44:55"
                        sx={{ mb: 2 }}
                        helperText="Format: XX:XX:XX:XX:XX:XX"
                      />
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Auto-generate random MAC"
                        sx={{ mb: 2 }}
                      />
                    </>
                  )}

                  <TextField
                    fullWidth
                    label="NAS IP Address"
                    value={testConfig.nas_ip}
                    onChange={(e) => setTestConfig({...testConfig, nas_ip: e.target.value})}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="RADIUS Secret"
                    type="password"
                    value={testConfig.nas_secret}
                    onChange={(e) => setTestConfig({...testConfig, nas_secret: e.target.value})}
                    sx={{ mb: 2 }}
                  />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Timeout (sec)"
                        type="number"
                        value={testConfig.timeout}
                        onChange={(e) => setTestConfig({...testConfig, timeout: e.target.value})}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Retries"
                        type="number"
                        value={testConfig.retries}
                        onChange={(e) => setTestConfig({...testConfig, retries: e.target.value})}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={running ? <CircularProgress size={20} color="inherit" /> : <PlayIcon />}
                    onClick={handleRunTest}
                    disabled={running}
                    fullWidth
                  >
                    {running ? 'Testing...' : 'Run Test'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<StopIcon />}
                    disabled={!running}
                    fullWidth
                  >
                    Stop
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Test Results */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Test Results
                </Typography>
                
                {testResults.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <NetworkIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      No test results yet. Run a test to see results.
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {testResults.map((result, index) => (
                      <ListItem key={result.id} divider={index < testResults.length - 1}>
                        <ListItemIcon>
                          {result.status === 'success' ? (
                            <SuccessIcon color="success" />
                          ) : (
                            <FailIcon color="error" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1">
                                {testTypes.find(t => t.value === result.type)?.label}
                              </Typography>
                              <Chip 
                                label={`${result.latency}ms`} 
                                size="small" 
                                color={result.latency < 50 ? 'success' : 'warning'}
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {new Date(result.timestamp).toLocaleTimeString()} - 
                              {targets.find(t => t.value === result.target)?.label}
                            </Typography>
                          }
                        />
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedResult(result);
                              setDetailsDialogOpen(true);
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* RADIUS Payload Details */}
          {testResults.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    RADIUS Payload Details - {testTypes.find(t => t.value === testResults[0].type)?.label}
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                          Request Attributes
                        </Typography>
                        <Box component="pre" sx={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                          {testResults[0].details.attributes.join('\n')}
                        </Box>
                        <IconButton 
                          size="small" 
                          onClick={() => copyToClipboard(testResults[0].details.attributes.join('\n'))}
                          sx={{ mt: 1 }}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                          Vendor Specific Attributes (VSA)
                        </Typography>
                        <Box component="pre" sx={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                          {testResults[0].details.vsa.join('\n')}
                        </Box>
                        <IconButton 
                          size="small" 
                          onClick={() => copyToClipboard(testResults[0].details.vsa.join('\n'))}
                          sx={{ mt: 1 }}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Response: <strong>{testResults[0].details.response}</strong> - 
                      Authentication {testResults[0].status === 'success' ? 'succeeded' : 'failed'} in {testResults[0].latency}ms
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Threat Simulation Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Threat Configuration
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Select Threat Type
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {threatTypes.map((threat) => (
                      <Grid item xs={6} key={threat.value}>
                        <Paper
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            border: '2px solid',
                            borderColor: threatConfig.type === threat.value ? 'primary.main' : 'divider',
                            '&:hover': { borderColor: 'primary.light' }
                          }}
                          onClick={() => setThreatConfig({...threatConfig, type: threat.value})}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {threat.icon}
                            <Typography variant="body2">{threat.label}</Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Intensity</InputLabel>
                    <Select
                      value={threatConfig.intensity}
                      onChange={(e) => setThreatConfig({...threatConfig, intensity: e.target.value})}
                      label="Intensity"
                    >
                      <MenuItem value="low">Low (10 RPS)</MenuItem>
                      <MenuItem value="medium">Medium (100 RPS)</MenuItem>
                      <MenuItem value="high">High (1000 RPS)</MenuItem>
                      <MenuItem value="extreme">Extreme (5000 RPS)</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Duration (seconds)"
                    type="number"
                    value={threatConfig.duration}
                    onChange={(e) => setThreatConfig({...threatConfig, duration: e.target.value})}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Target Users/Devices"
                    type="number"
                    value={threatConfig.target_users}
                    onChange={(e) => setThreatConfig({...threatConfig, target_users: e.target.value})}
                    sx={{ mb: 2 }}
                  />

                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      This will generate malicious traffic patterns. Use only in isolated test environments.
                    </Typography>
                  </Alert>

                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<SecurityIcon />}
                    fullWidth
                  >
                    Start Threat Simulation
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Threat Detection Results
                </Typography>
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <SecurityIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No threat simulation running
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Batch Test Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Batch Test Suite
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Run multiple authentication tests in sequence
                </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    Batch testing allows you to validate multiple authentication methods and configurations automatically.
                    Import a CSV file or configure tests manually.
                  </Typography>
                </Alert>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button variant="outlined" startIcon={<SettingsIcon />}>
                    Configure Batch
                  </Button>
                  <Button variant="outlined" startIcon={<DownloadIcon />}>
                    Import CSV
                  </Button>
                  <Button variant="contained" startIcon={<PlayIcon />}>
                    Run Batch Test
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Details Dialog */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              RADIUS Packet Details - {selectedResult && testTypes.find(t => t.value === selectedResult.type)?.label}
            </Typography>
            {selectedResult && (
              <Chip 
                label={selectedResult.details.status} 
                color={selectedResult.details.status === 'Valid Auth' ? 'success' : 'error'}
                icon={selectedResult.details.status === 'Valid Auth' ? <CheckIcon /> : <FailIcon />}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedResult && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Alert severity={selectedResult.details.status === 'Valid Auth' ? 'success' : 'error'}>
                  <Typography variant="body2">
                    <strong>Result:</strong> {selectedResult.details.response} - 
                    {selectedResult.details.status === 'Valid Auth' ? ' Authentication Successful' : ' Authentication Failed'}
                    {' '}(Latency: {selectedResult.latency}ms)
                  </Typography>
                </Alert>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    Standard RADIUS Attributes
                  </Typography>
                  <Box component="pre" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', overflow: 'auto' }}>
                    {selectedResult.details.attributes.join('\n')}
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    Vendor Specific Attributes (VSA)
                  </Typography>
                  <Box component="pre" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', overflow: 'auto' }}>
                    {selectedResult.details.vsa.join('\n')}
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    Raw Packet Hex Dump
                  </Typography>
                  <Box component="pre" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', overflow: 'auto' }}>
                    {selectedResult.details.rawPacket}
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Validation Points
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <CheckIcon color="success" />
                      <Typography variant="body2">Packet Structure</Typography>
                      <Typography variant="caption" color="text.secondary">RFC Compliant</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <CheckIcon color="success" />
                      <Typography variant="body2">Attribute Recognition</Typography>
                      <Typography variant="caption" color="text.secondary">100% Parsed</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      {selectedResult.latency < 100 ? <CheckIcon color="success" /> : <WarningIcon color="warning" />}
                      <Typography variant="body2">Latency</Typography>
                      <Typography variant="caption" color="text.secondary">{selectedResult.latency}ms</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <CheckIcon color="success" />
                      <Typography variant="body2">Transaction</Typography>
                      <Typography variant="caption" color="text.secondary">Complete</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedResult?.details, null, 2))}>
            Copy Details
          </Button>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuickTest;