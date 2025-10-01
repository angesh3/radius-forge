import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Speed as SpeedIcon,
  Info as InfoIcon,
  Help as HelpIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  Router as RouterIcon,
  Key as KeyIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  CloudUpload as UploadIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

const Configuration = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [integrationGuideOpen, setIntegrationGuideOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState('access-manager');
  const [addServerOpen, setAddServerOpen] = useState(false);
  const [newServer, setNewServer] = useState({
    name: '',
    host: '',
    type: 'Access Manager',
    authPort: 1812,
    acctPort: 1813,
    secret: '',
    enabled: true,
  });

  // Deployment State
  const [portConfig, setPortConfig] = useState({});
  const [bundles, setBundles] = useState([]);
  const [deploymentHistory, setDeploymentHistory] = useState([]);
  const [bundleCreating, setBundleCreating] = useState(false);
  const [portValidating, setPortValidating] = useState(false);

  // System Configuration State
  const [systemConfig, setSystemConfig] = useState({
    systemName: 'RadiusForge-Prod',
    maxConcurrentTests: 100,
    defaultTimeout: 30,
    retryAttempts: 3,
    logLevel: 'INFO',
    enableMetrics: true,
    enableAlerts: true,
    autoCleanup: true,
    cleanupInterval: 24,
  });

  // RADIUS Configuration State - Access Manager as default
  const [radiusServers, setRadiusServers] = useState([
    {
      id: 1,
      name: 'Access Manager Primary',
      host: '192.168.1.10',
      port: 1812,
      secret: '••••••••',
      type: 'Access Manager',
      enabled: true,
      authPort: 1812,
      acctPort: 1813,
    },
    {
      id: 2,
      name: 'Access Manager Secondary',
      host: '192.168.1.11',
      port: 1812,
      secret: '••••••••',
      type: 'Access Manager',
      enabled: true,
      authPort: 1812,
      acctPort: 1813,
    },
    {
      id: 3,
      name: 'Access Manager DR',
      host: '192.168.1.12',
      port: 1812,
      secret: '••••••••',
      type: 'Access Manager',
      enabled: false,
      authPort: 1812,
      acctPort: 1813,
    },
  ]);

  // Test Profiles State with MAB and 802.1X
  const [testProfiles, setTestProfiles] = useState([
    {
      id: 1,
      name: 'EAP-TLS Profile',
      type: 'RADIUS',
      authType: 'EAP-TLS',
      rps: 1000,
      duration: 300,
      clients: 50,
      enabled: true,
    },
    {
      id: 2,
      name: 'MAB Profile',
      type: 'RADIUS',
      authType: 'MAB',
      rps: 500,
      duration: 300,
      clients: 25,
      enabled: true,
    },
    {
      id: 3,
      name: '802.1X Profile',
      type: 'RADIUS',
      authType: '802.1X',
      rps: 2000,
      duration: 600,
      clients: 100,
      enabled: true,
    },
    {
      id: 4,
      name: 'PEAP Profile',
      type: 'RADIUS',
      authType: 'PEAP',
      rps: 750,
      duration: 300,
      clients: 40,
      enabled: true,
    },
    {
      id: 5,
      name: 'TACACS+ Profile',
      type: 'TACACS+',
      authType: 'ASCII',
      rps: 200,
      duration: 300,
      clients: 10,
      enabled: false,
    },
  ]);

  const serverTypes = [
    { value: 'Access Manager', label: 'Cisco Access Manager', description: 'Primary AAA solution for enterprise authentication' },
    { value: 'Cisco ISE', label: 'Cisco ISE', description: 'Alternative AAA target for policy services integration' },
    { value: 'FreeRADIUS', label: 'FreeRADIUS', description: 'Open-source RADIUS server' },
    { value: 'Generic RADIUS', label: 'Generic RADIUS', description: 'Any RFC-compliant RADIUS server' },
  ];

  const handleSaveConfig = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1500);
  };

  const handleOpenIntegrationGuide = (guideType) => {
    setSelectedGuide(guideType);
    setIntegrationGuideOpen(true);
  };

  // Deployment Functions
  const fetchPortConfig = async () => {
    try {
      const response = await fetch('http://localhost:8910/api/system/ports');
      const data = await response.json();
      setPortConfig(data);
    } catch (error) {
      console.error('Failed to fetch port config:', error);
    }
  };

  const fetchBundles = async () => {
    try {
      const response = await fetch('http://localhost:8910/api/deployment/bundles');
      const data = await response.json();
      setBundles(data.bundles || []);
    } catch (error) {
      console.error('Failed to fetch bundles:', error);
    }
  };

  const fetchDeploymentHistory = async () => {
    try {
      const response = await fetch('http://localhost:8910/api/deployment/history');
      const data = await response.json();
      setDeploymentHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch deployment history:', error);
    }
  };

  const validatePorts = async () => {
    setPortValidating(true);
    try {
      const response = await fetch('http://localhost:8910/api/system/ports/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ports: portConfig.ports })
      });
      const data = await response.json();
      console.log('Port validation results:', data);
      // You could show results in a dialog or notification
    } catch (error) {
      console.error('Port validation failed:', error);
    } finally {
      setPortValidating(false);
    }
  };

  const createBundle = async (bumpType = 'patch') => {
    setBundleCreating(true);
    try {
      const response = await fetch('http://localhost:8910/api/deployment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bump_type: bumpType })
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchBundles();
        await fetchDeploymentHistory();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        console.error('Bundle creation failed:', data.error);
      }
    } catch (error) {
      console.error('Failed to create bundle:', error);
    } finally {
      setBundleCreating(false);
    }
  };

  // Load deployment data when tab is accessed
  React.useEffect(() => {
    if (activeTab === 4) { // Deployment tab
      fetchPortConfig();
      fetchBundles();
      fetchDeploymentHistory();
    }
  }, [activeTab]);

  const IntegrationGuide = () => (
    <Dialog 
      open={integrationGuideOpen} 
      onClose={() => setIntegrationGuideOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpIcon color="primary" />
          <Typography variant="h6">
            {selectedGuide === 'access-manager' ? 'Access Manager' : 'Cisco ISE'} Integration Guide
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {selectedGuide === 'access-manager' ? (
          <Stepper orientation="vertical" activeStep={-1}>
            <Step expanded>
              <StepLabel>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  RadiusForge Configuration
                </Typography>
              </StepLabel>
              <StepContent>
                <Paper sx={{ p: 2, backgroundColor: 'grey.50', mb: 2 }}>
                  <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                    RADIUS Server Settings:
                  </Typography>
                  <Box component="pre" sx={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
{`Server Type: Access Manager
Primary Host: 192.168.1.10
Secondary Host: 192.168.1.11
Auth Port: 1812
Acct Port: 1813
Secret: Your-Shared-Secret-Key
Timeout: 5 seconds
Retries: 3`}
                  </Box>
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText('192.168.1.10')}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Paper>
              </StepContent>
            </Step>
            
            <Step expanded>
              <StepLabel>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Access Manager Configuration
                </Typography>
              </StepLabel>
              <StepContent>
                <Paper sx={{ p: 2, backgroundColor: 'grey.50', mb: 2 }}>
                  <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                    1. Add NAD/Network Device:
                  </Typography>
                  <Box component="pre" sx={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
{`Navigate to: Network Resources > Network Devices
Click: Add Network Device
Name: RadiusForge-TestClient
IP Address: 10.0.0.0/24 (or specific IPs)
Shared Secret: Your-Shared-Secret-Key
Device Type: Network Access Device
Vendor: Generic
Protocol: RADIUS`}
                  </Box>
                </Paper>
                
                <Paper sx={{ p: 2, backgroundColor: 'grey.50', mb: 2 }}>
                  <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                    2. Configure Authentication Policies:
                  </Typography>
                  <Box component="pre" sx={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
{`Policy Sets > Authentication
Create Policy: RadiusForge-Auth
Conditions:
  - RADIUS:NAS-IP-Address EQUALS 10.0.0.0/24
  - RADIUS:Service-Type EQUALS Login
Authentication Method:
  - EAP-TLS: Certificate-Based
  - MAB: Internal Users
  - 802.1X: Active Directory`}
                  </Box>
                </Paper>

                <Paper sx={{ p: 2, backgroundColor: 'grey.50', mb: 2 }}>
                  <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                    3. Authorization Profiles:
                  </Typography>
                  <Box component="pre" sx={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
{`Policy Elements > Results > Authorization
Profile Name: Employee-Access
Access Type: ACCESS_ACCEPT
VLAN: 100
dACL: permit ip any any
SGT: Employees (4)
Session Timeout: 28800`}
                  </Box>
                </Paper>
              </StepContent>
            </Step>
            
            <Step expanded>
              <StepLabel>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Test Validation
                </Typography>
              </StepLabel>
              <StepContent>
                <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                  <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                    Test Commands:
                  </Typography>
                  <Box component="pre" sx={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
{`# Test RADIUS connectivity
radtest testuser password 192.168.1.10 0 Your-Shared-Secret-Key

# Test EAP-TLS
eapol_test -c eap-tls.conf -a 192.168.1.10 -s Your-Shared-Secret-Key

# Monitor Access Manager Logs
tail -f /var/log/access-manager/radius.log`}
                  </Box>
                </Paper>
              </StepContent>
            </Step>
          </Stepper>
        ) : (
          <Stepper orientation="vertical" activeStep={-1}>
            <Step expanded>
              <StepLabel>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Cisco ISE Configuration
                </Typography>
              </StepLabel>
              <StepContent>
                <Paper sx={{ p: 2, backgroundColor: 'grey.50', mb: 2 }}>
                  <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                    ISE Network Device Setup:
                  </Typography>
                  <Box component="pre" sx={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
{`Administration > Network Resources > Network Devices
Add Device:
  Name: RadiusForge-Client
  IP: 10.0.0.0/24
  Shared Secret: ISE-Secret-Key
  Device Profile: Cisco
  TACACS+ Settings: Enable if needed`}
                  </Box>
                </Paper>
              </StepContent>
            </Step>
          </Stepper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setIntegrationGuideOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Configuration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage system settings, servers, and test profiles
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
          >
            Reset
          </Button>
          <Button 
            variant="contained" 
            startIcon={saving ? null : <SaveIcon />}
            onClick={handleSaveConfig}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Configuration saved successfully!
        </Alert>
      )}

      {/* Info Banner for Access Manager */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
        <Typography variant="body2">
          <strong>Primary Target: Access Manager</strong> - RadiusForge is optimized for testing Access Manager AAA services.
          Cisco ISE integration is optional for extended policy services via pxGrid.
        </Typography>
      </Alert>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="System" icon={<SettingsIcon />} iconPosition="start" />
        <Tab label="RADIUS Servers" icon={<RouterIcon />} iconPosition="start" />
        <Tab label="Test Profiles" icon={<SpeedIcon />} iconPosition="start" />
        <Tab label="Network" icon={<NetworkIcon />} iconPosition="start" />
        <Tab label="Deployment" icon={<StorageIcon />} iconPosition="start" />
      </Tabs>

      {/* System Configuration Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  System Settings
                </Typography>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="System Name"
                      value={systemConfig.systemName}
                      onChange={(e) => setSystemConfig({...systemConfig, systemName: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Max Concurrent Tests"
                      type="number"
                      value={systemConfig.maxConcurrentTests}
                      onChange={(e) => setSystemConfig({...systemConfig, maxConcurrentTests: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Default Timeout (seconds)"
                      type="number"
                      value={systemConfig.defaultTimeout}
                      onChange={(e) => setSystemConfig({...systemConfig, defaultTimeout: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Log Level</InputLabel>
                      <Select
                        value={systemConfig.logLevel}
                        onChange={(e) => setSystemConfig({...systemConfig, logLevel: e.target.value})}
                        label="Log Level"
                      >
                        <MenuItem value="DEBUG">DEBUG</MenuItem>
                        <MenuItem value="INFO">INFO</MenuItem>
                        <MenuItem value="WARNING">WARNING</MenuItem>
                        <MenuItem value="ERROR">ERROR</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={systemConfig.enableMetrics}
                            onChange={(e) => setSystemConfig({...systemConfig, enableMetrics: e.target.checked})}
                          />
                        }
                        label="Enable Metrics Collection"
                      />
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={systemConfig.enableAlerts}
                            onChange={(e) => setSystemConfig({...systemConfig, enableAlerts: e.target.checked})}
                          />
                        }
                        label="Enable Alerts"
                      />
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={systemConfig.autoCleanup}
                            onChange={(e) => setSystemConfig({...systemConfig, autoCleanup: e.target.checked})}
                          />
                        }
                        label="Auto Cleanup Old Data"
                      />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* RADIUS Servers Tab */}
      {activeTab === 1 && (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Alert severity="info" icon={<InfoIcon />} sx={{ flexGrow: 1, mr: 2 }}>
              <Typography variant="body2">
                <strong>Access Manager</strong> is the primary RADIUS/TACACS+ server for enterprise AAA. 
                Configure your Access Manager instances here for load testing.
              </Typography>
            </Alert>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<HelpIcon />}
                onClick={() => handleOpenIntegrationGuide('access-manager')}
              >
                Access Manager Guide
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<HelpIcon />}
                onClick={() => handleOpenIntegrationGuide('ise')}
              >
                ISE Guide
              </Button>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      RADIUS Servers
                    </Typography>
                    <Button 
                      startIcon={<AddIcon />} 
                      variant="contained" 
                      size="small"
                      onClick={() => setAddServerOpen(!addServerOpen)}
                    >
                      Add Server
                    </Button>
                  </Box>
                  
                  <List>
                    {radiusServers.map((server, index) => (
                      <React.Fragment key={server.id}>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {server.name}
                                </Typography>
                                <Chip 
                                  label={server.enabled ? 'Enabled' : 'Disabled'} 
                                  color={server.enabled ? 'success' : 'default'}
                                  size="small"
                                />
                                <Chip 
                                  label={server.type}
                                  color={server.type === 'Access Manager' ? 'primary' : 'default'}
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 1 }}>
                                <Grid container spacing={2}>
                                  <Grid item xs={12} sm={3}>
                                    <Typography variant="caption" color="text.secondary">Host/IP</Typography>
                                    <Typography variant="body2">{server.host}</Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={2}>
                                    <Typography variant="caption" color="text.secondary">Auth Port</Typography>
                                    <Typography variant="body2">{server.authPort}</Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={2}>
                                    <Typography variant="caption" color="text.secondary">Acct Port</Typography>
                                    <Typography variant="body2">{server.acctPort}</Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={3}>
                                    <Typography variant="caption" color="text.secondary">Shared Secret</Typography>
                                    <Typography variant="body2">{server.secret}</Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={2}>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      <IconButton size="small">
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton size="small" color="error">
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  </Grid>
                                </Grid>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < radiusServers.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Add New Server Form */}
            <Grid item xs={12}>
              <Accordion expanded={addServerOpen} onChange={(e, isOpen) => setAddServerOpen(isOpen)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Add New Server
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField 
                        fullWidth 
                        label="Server Name" 
                        placeholder="e.g., Access Manager Primary"
                        value={newServer.name}
                        onChange={(e) => setNewServer({...newServer, name: e.target.value})}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Server Type</InputLabel>
                        <Select 
                          value={newServer.type} 
                          onChange={(e) => setNewServer({...newServer, type: e.target.value})}
                          label="Server Type"
                        >
                          {serverTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              <Box>
                                <Typography variant="body2">{type.label}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {type.description}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField 
                        fullWidth 
                        label="Host/IP Address" 
                        placeholder="192.168.1.10"
                        value={newServer.host}
                        onChange={(e) => setNewServer({...newServer, host: e.target.value})}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField 
                        fullWidth 
                        label="Auth Port" 
                        value={newServer.authPort}
                        onChange={(e) => setNewServer({...newServer, authPort: e.target.value})}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField 
                        fullWidth 
                        label="Accounting Port" 
                        value={newServer.acctPort}
                        onChange={(e) => setNewServer({...newServer, acctPort: e.target.value})}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField 
                        fullWidth 
                        label="Shared Secret" 
                        type="password"
                        value={newServer.secret}
                        onChange={(e) => setNewServer({...newServer, secret: e.target.value})}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="Use a strong shared secret">
                                <InfoIcon fontSize="small" />
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={newServer.enabled}
                            onChange={(e) => setNewServer({...newServer, enabled: e.target.checked})}
                          />
                        }
                        label="Enable Server"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button 
                        variant="contained" 
                        onClick={() => {
                          if (newServer.name && newServer.host && newServer.secret) {
                            setRadiusServers([...radiusServers, {...newServer, id: Date.now()}]);
                            setNewServer({
                              name: '',
                              host: '',
                              type: 'Access Manager',
                              authPort: 1812,
                              acctPort: 1813,
                              secret: '',
                              enabled: true,
                            });
                            setAddServerOpen(false);
                            setSaved(true);
                            setTimeout(() => setSaved(false), 3000);
                          }
                        }}
                      >
                        Add Server
                      </Button>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </>
      )}

      {/* Test Profiles Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Test Profiles
                  </Typography>
                  <Button startIcon={<AddIcon />} variant="contained" size="small">
                    Add Profile
                  </Button>
                </Box>
                
                <List>
                  {testProfiles.map((profile, index) => (
                    <React.Fragment key={profile.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {profile.name}
                              </Typography>
                              <Chip 
                                label={profile.authType} 
                                color="primary" 
                                size="small" 
                                variant="outlined"
                              />
                              <Chip 
                                label={profile.enabled ? 'Enabled' : 'Disabled'} 
                                color={profile.enabled ? 'success' : 'default'}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Grid container spacing={2}>
                                <Grid item xs={6} sm={2}>
                                  <Typography variant="caption" color="text.secondary">Type</Typography>
                                  <Typography variant="body2">{profile.type}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={2}>
                                  <Typography variant="caption" color="text.secondary">RPS</Typography>
                                  <Typography variant="body2">{profile.rps}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={2}>
                                  <Typography variant="caption" color="text.secondary">Duration</Typography>
                                  <Typography variant="body2">{profile.duration}s</Typography>
                                </Grid>
                                <Grid item xs={6} sm={2}>
                                  <Typography variant="caption" color="text.secondary">Clients</Typography>
                                  <Typography variant="body2">{profile.clients}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                    <IconButton size="small">
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" color="error">
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </Grid>
                              </Grid>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < testProfiles.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Network Tab */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Network Configuration
                </Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    Configure network settings for RadiusForge to communicate with Access Manager and other AAA servers.
                  </Typography>
                </Alert>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Source IP Address"
                      defaultValue="10.0.0.1"
                      helperText="IP address RadiusForge will use as source"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Source Port Range"
                      defaultValue="20000-30000"
                      helperText="Port range for RADIUS client connections"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="MTU Size"
                      type="number"
                      defaultValue="1500"
                      helperText="Maximum transmission unit size"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Socket Buffer Size"
                      type="number"
                      defaultValue="65536"
                      helperText="UDP socket buffer size in bytes"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Deployment Tab */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          {/* Port Configuration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Port Configuration
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={validatePorts}
                    disabled={portValidating || !portConfig.ports}
                    startIcon={portValidating ? null : <NetworkIcon />}
                  >
                    {portValidating ? 'Validating...' : 'Validate Ports'}
                  </Button>
                </Box>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    RadiusForge v1.3.0 uses ports 8910-8926 for various services.
                  </Typography>
                </Alert>

                {portConfig.ports && (
                  <List dense>
                    {Object.entries(portConfig.ports).map(([service, config]) => (
                      <ListItem key={service} sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 120 }}>
                                {service.replace('_', ' ').toUpperCase()}
                              </Typography>
                              <Chip 
                                label={`Port ${config.port}`}
                                size="small"
                                color={config.status === 'active' ? 'success' : 
                                       config.status === 'available' ? 'info' : 'default'}
                              />
                              <Chip 
                                label={config.status}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={config.description}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}

                {portConfig.range && (
                  <Paper sx={{ p: 2, mt: 2, backgroundColor: 'grey.50' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Port Range Summary:
                    </Typography>
                    <Typography variant="body2">
                      Range: {portConfig.range.start} - {portConfig.range.end} 
                      ({portConfig.range.total} ports total)
                    </Typography>
                  </Paper>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Bundle Management */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Deployment Bundles
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => createBundle('patch')}
                    disabled={bundleCreating}
                    startIcon={bundleCreating ? null : <UploadIcon />}
                  >
                    {bundleCreating ? 'Creating...' : 'Create Bundle'}
                  </Button>
                </Box>
                
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Creating bundles will increment the version number and generate deployment packages.
                  </Typography>
                </Alert>

                {bundles.length > 0 ? (
                  <List dense>
                    {bundles.slice(0, 5).map((bundle, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {bundle.name}
                              </Typography>
                              <Chip 
                                label={bundle.type}
                                size="small"
                                color={bundle.type === 'full' ? 'primary' : 'secondary'}
                              />
                            </Box>
                          }
                          secondary={`${bundle.size_mb} MB • ${new Date(bundle.created).toLocaleDateString()}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton size="small">
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No deployment bundles available. Create your first bundle to get started.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Deployment History */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <HistoryIcon />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Deployment History
                  </Typography>
                </Box>
                
                {deploymentHistory.length > 0 ? (
                  <List>
                    {deploymentHistory.slice(0, 10).map((deployment, index) => (
                      <React.Fragment key={index}>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  Version {deployment.version}
                                </Typography>
                                <Chip 
                                  label={deployment.bundle_type}
                                  size="small"
                                  color={deployment.bundle_type === 'full' ? 'primary' : 'secondary'}
                                />
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(deployment.created_at).toLocaleString()}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Bundle: {deployment.bundle_path} 
                                  {deployment.size_bytes && ` (${(deployment.size_bytes / 1024 / 1024).toFixed(2)} MB)`}
                                </Typography>
                                {deployment.git_commit && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    Commit: {deployment.git_commit}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < deploymentHistory.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No deployment history available.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Quick Actions
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<UploadIcon />}
                      onClick={() => createBundle('major')}
                      disabled={bundleCreating}
                    >
                      Major Release
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<UploadIcon />}
                      onClick={() => createBundle('minor')}
                      disabled={bundleCreating}
                    >
                      Minor Release
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<UploadIcon />}
                      onClick={() => createBundle('patch')}
                      disabled={bundleCreating}
                    >
                      Patch Release
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<NetworkIcon />}
                      onClick={validatePorts}
                      disabled={portValidating}
                    >
                      Validate Ports
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <IntegrationGuide />
    </Box>
  );
};

export default Configuration;
