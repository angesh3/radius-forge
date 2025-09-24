import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Html as HtmlIcon,
  TableChart as CsvIcon,
  Code as JsonIcon,
  Email as EmailIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckIcon,
  Assessment as ReportIcon,
  Timeline as TimelineIcon,
  BugReport as TestIcon,
  Security as SecurityIcon,
  Speed as PerformanceIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';

const ReportEnhanced = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [selectedRuns, setSelectedRuns] = useState([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [reportConfig, setReportConfig] = useState({
    format: 'PDF',
    includeCharts: true,
    includeConfig: true,
    includeIncidents: true,
    includeSloVerdicts: true,
    includeRegressionAnalysis: true
  });

  const [emailConfig, setEmailConfig] = useState({
    enabled: false,
    recipients: '',
    subject: 'RadiusForge Test Report - {runId}',
    smtpServer: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpTls: true
  });

  // Mock data for available runs
  const [availableRuns] = useState([
    {
      id: 'run-001',
      name: 'Scale Test 5K RPS',
      timestamp: '2024-08-14T10:30:00Z',
      duration: '00:05:30',
      target: 'Access Manager',
      rps: 5000,
      status: 'completed',
      passRate: 98.5,
      tags: ['nightly', '5k-rps'],
      errors: 12,
      latencyP95: 45
    },
    {
      id: 'run-002',
      name: 'Performance Benchmark',
      timestamp: '2024-08-14T09:15:00Z',
      duration: '00:12:45',
      target: 'Cisco ISE',
      rps: 10000,
      status: 'completed',
      passRate: 95.2,
      tags: ['benchmark', 'slo-validation'],
      errors: 48,
      latencyP95: 78
    },
    {
      id: 'run-003',
      name: 'EAP-TLS Load Test',
      timestamp: '2024-08-14T08:00:00Z',
      duration: '00:08:20',
      target: 'Access Manager',
      rps: 2500,
      status: 'completed',
      passRate: 99.1,
      tags: ['eap-tls', 'tls-test'],
      errors: 5,
      latencyP95: 125
    },
    {
      id: 'run-004',
      name: 'Threat Generation Test',
      timestamp: '2024-08-13T16:45:00Z',
      duration: '00:03:15',
      target: 'Lab Environment',
      rps: 1000,
      status: 'completed',
      passRate: 87.3,
      tags: ['threat-gen', 'security-test'],
      errors: 127,
      latencyP95: 234
    }
  ]);

  const [generatedReports] = useState([
    {
      id: 'report-001',
      runId: 'run-001',
      runName: 'Scale Test 5K RPS',
      format: 'PDF',
      generatedAt: '2024-08-14T10:35:00Z',
      fileSize: '2.4 MB',
      downloadUrl: '/api/reports/report-001.pdf'
    },
    {
      id: 'report-002',
      runId: 'run-002',
      runName: 'Performance Benchmark',
      format: 'HTML',
      generatedAt: '2024-08-14T09:20:00Z',
      fileSize: '1.8 MB',
      downloadUrl: '/api/reports/report-002.html'
    }
  ]);

  const handleRunSelection = (runId) => {
    setSelectedRuns(prev => 
      prev.includes(runId)
        ? prev.filter(id => id !== runId)
        : [...prev, runId]
    );
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedRuns(availableRuns.map(run => run.id));
    } else {
      setSelectedRuns([]);
    }
  };

  const handleGenerateReport = async () => {
    if (selectedRuns.length === 0) {
      return;
    }

    setIsGenerating(true);
    
    // Simulate report generation
    setTimeout(() => {
      setIsGenerating(false);
      if (emailConfig.enabled) {
        setEmailDialogOpen(true);
      }
    }, 3000);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getFormatIcon = (format) => {
    switch(format) {
      case 'PDF': return <PdfIcon />;
      case 'HTML': return <HtmlIcon />;
      case 'CSV': return <CsvIcon />;
      case 'JSON': return <JsonIcon />;
      default: return <ReportIcon />;
    }
  };

  const renderTestRuns = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={selectedRuns.length > 0 && selectedRuns.length < availableRuns.length}
                checked={selectedRuns.length === availableRuns.length}
                onChange={handleSelectAll}
              />
            </TableCell>
            <TableCell>Run Name</TableCell>
            <TableCell>Timestamp</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>Target</TableCell>
            <TableCell align="center">RPS</TableCell>
            <TableCell align="center">Pass Rate</TableCell>
            <TableCell align="center">P95 Latency</TableCell>
            <TableCell>Tags</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {availableRuns.map((run) => (
            <TableRow
              key={run.id}
              hover
              selected={selectedRuns.includes(run.id)}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedRuns.includes(run.id)}
                  onChange={() => handleRunSelection(run.id)}
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {run.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatTimestamp(run.timestamp)}
                </Typography>
              </TableCell>
              <TableCell>{run.duration}</TableCell>
              <TableCell>{run.target}</TableCell>
              <TableCell align="center">
                <Chip label={run.rps.toLocaleString()} size="small" />
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={`${run.passRate}%`}
                  size="small"
                  color={run.passRate >= 95 ? 'success' : 'warning'}
                />
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2">{run.latencyP95}ms</Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {run.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderReportConfig = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <FormControl fullWidth>
          <InputLabel>Report Format</InputLabel>
          <Select
            value={reportConfig.format}
            label="Report Format"
            onChange={(e) => setReportConfig({ ...reportConfig, format: e.target.value })}
            startAdornment={getFormatIcon(reportConfig.format)}
          >
            <MenuItem value="PDF">PDF Document</MenuItem>
            <MenuItem value="HTML">HTML Report</MenuItem>
            <MenuItem value="CSV">CSV Export</MenuItem>
            <MenuItem value="JSON">JSON Data</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Include in Report</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={reportConfig.includeCharts}
                    onChange={(e) => setReportConfig({ ...reportConfig, includeCharts: e.target.checked })}
                  />
                }
                label="Charts & Visualizations"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={reportConfig.includeConfig}
                    onChange={(e) => setReportConfig({ ...reportConfig, includeConfig: e.target.checked })}
                  />
                }
                label="Configuration Snapshot"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={reportConfig.includeIncidents}
                    onChange={(e) => setReportConfig({ ...reportConfig, includeIncidents: e.target.checked })}
                  />
                }
                label="Top Incidents"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={reportConfig.includeSloVerdicts}
                    onChange={(e) => setReportConfig({ ...reportConfig, includeSloVerdicts: e.target.checked })}
                  />
                }
                label="SLO Verdicts"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={reportConfig.includeRegressionAnalysis}
                    onChange={(e) => setReportConfig({ ...reportConfig, includeRegressionAnalysis: e.target.checked })}
                  />
                }
                label="Regression Analysis"
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={emailConfig.enabled}
              onChange={(e) => setEmailConfig({ ...emailConfig, enabled: e.target.checked })}
            />
          }
          label="Enable Email Distribution"
        />
      </Grid>
    </Grid>
  );

  const renderGeneratedReports = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Report ID</TableCell>
            <TableCell>Test Run</TableCell>
            <TableCell>Format</TableCell>
            <TableCell>Generated</TableCell>
            <TableCell>File Size</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {generatedReports.map((report) => (
            <TableRow key={report.id} hover>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {report.id}
                </Typography>
              </TableCell>
              <TableCell>{report.runName}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getFormatIcon(report.format)}
                  <Typography variant="body2">{report.format}</Typography>
                </Box>
              </TableCell>
              <TableCell>{formatTimestamp(report.generatedAt)}</TableCell>
              <TableCell>{report.fileSize}</TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Tooltip title="View">
                    <IconButton size="small" color="primary">
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download">
                    <IconButton size="small" color="success">
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Email">
                    <IconButton size="small" color="info">
                      <EmailIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Report Generator
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Produce and distribute human-readable summaries of test runs
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<TestIcon />}
            onClick={() => navigate('/test-coverage')}
          >
            Test Coverage Report
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="overline">
                    Available Runs
                  </Typography>
                  <Typography variant="h4">{availableRuns.length}</Typography>
                </Box>
                <Badge badgeContent="New" color="error">
                  <TimelineIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                </Badge>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="overline">
                    Generated Reports
                  </Typography>
                  <Typography variant="h4">{generatedReports.length}</Typography>
                </Box>
                <ReportIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="overline">
                    Test Coverage
                  </Typography>
                  <Typography variant="h4">78.5%</Typography>
                </Box>
                <CheckIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/test-coverage')}>
                View Coverage Report
              </Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="overline">
                    Last Report
                  </Typography>
                  <Typography variant="body2">2 hours ago</Typography>
                </Box>
                <TimeIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Select Test Runs" />
          <Tab label="Report Configuration" />
          <Tab label="Generated Reports" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Available Test Runs</Typography>
                <Chip
                  label={`${selectedRuns.length} selected`}
                  color="primary"
                  variant={selectedRuns.length > 0 ? "filled" : "outlined"}
                />
              </Box>
              {renderTestRuns()}
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>Report Configuration</Typography>
              {renderReportConfig()}
            </Box>
          )}

          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Generated Reports</Typography>
              {renderGeneratedReports()}
            </Box>
          )}
        </Box>

        {/* Action Bar */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {selectedRuns.length > 0 && (
            <Alert severity="info" sx={{ flex: 1 }}>
              {selectedRuns.length} test run(s) selected for report generation
            </Alert>
          )}
          <Button
            variant="contained"
            startIcon={isGenerating ? <LinearProgress /> : <SendIcon />}
            onClick={handleGenerateReport}
            disabled={selectedRuns.length === 0 || isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>
        </Box>
      </Paper>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Email Report</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Recipients"
            placeholder="email1@example.com, email2@example.com"
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Subject"
            defaultValue="RadiusForge Test Report"
            margin="normal"
          />
          <TextField
            fullWidth
            label="Message"
            placeholder="Optional message to include with the report"
            margin="normal"
            multiline
            rows={4}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<EmailIcon />}>Send Email</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportEnhanced;