import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tab,
  Tabs,
  Tooltip,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Divider,
  Badge,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  Warning as SkipIcon,
  Speed as PerformanceIcon,
  BugReport as BugIcon,
  Code as CodeIcon,
  Functions as FunctionIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendIcon,
  TrendingDown as TrendDownIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  Api as ApiIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

const TestCoverageReport = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedSuite, setExpandedSuite] = useState('unit-tests');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Generate timestamp
  const reportTimestamp = new Date().toLocaleString();
  const buildId = 'BUILD-' + Date.now();

  // Coverage metrics
  const coverageData = {
    overall: 78.5,
    unit: 85.2,
    integration: 72.8,
    e2e: 68.4,
    lines: 8542,
    branches: 4521,
    functions: 1234,
    statements: 9876,
  };

  // Test suite results
  const testSuites = {
    unit: {
      total: 256,
      passed: 218,
      failed: 12,
      skipped: 26,
      duration: '3m 42s',
      suites: [
        {
          name: 'Authentication Module',
          tests: 45,
          passed: 42,
          failed: 2,
          skipped: 1,
          coverage: 92.3,
          duration: '45s',
          files: [
            { name: 'auth.service.spec.js', passed: 12, failed: 0, coverage: 95.2 },
            { name: 'auth.controller.spec.js', passed: 8, failed: 1, coverage: 88.7 },
            { name: 'auth.middleware.spec.js', passed: 10, failed: 0, coverage: 93.1 },
            { name: 'auth.validator.spec.js', passed: 12, failed: 1, coverage: 91.5 },
          ]
        },
        {
          name: 'RADIUS Protocol',
          tests: 68,
          passed: 61,
          failed: 3,
          skipped: 4,
          coverage: 88.7,
          duration: '1m 12s',
          files: [
            { name: 'radius.parser.spec.js', passed: 20, failed: 1, coverage: 89.3 },
            { name: 'radius.builder.spec.js', passed: 18, failed: 0, coverage: 92.1 },
            { name: 'radius.attributes.spec.js', passed: 15, failed: 2, coverage: 85.6 },
            { name: 'radius.crypto.spec.js', passed: 8, failed: 0, coverage: 88.9 },
          ]
        },
        {
          name: 'Load Generator',
          tests: 52,
          passed: 48,
          failed: 2,
          skipped: 2,
          coverage: 81.3,
          duration: '38s',
          files: [
            { name: 'generator.core.spec.js', passed: 15, failed: 0, coverage: 84.2 },
            { name: 'generator.scheduler.spec.js', passed: 12, failed: 1, coverage: 79.8 },
            { name: 'generator.metrics.spec.js', passed: 10, failed: 0, coverage: 82.4 },
            { name: 'generator.ramp.spec.js', passed: 11, failed: 1, coverage: 78.9 },
          ]
        },
        {
          name: 'UI Components',
          tests: 91,
          passed: 67,
          failed: 5,
          skipped: 19,
          coverage: 73.6,
          duration: '1m 17s',
          files: [
            { name: 'Dashboard.test.jsx', passed: 12, failed: 1, coverage: 76.3 },
            { name: 'ScaleTest.test.jsx', passed: 15, failed: 2, coverage: 71.8 },
            { name: 'LiveTelemetry.test.jsx', passed: 8, failed: 0, coverage: 69.2 },
            { name: 'Report.test.jsx', passed: 10, failed: 1, coverage: 74.5 },
            { name: 'Configuration.test.jsx', passed: 22, failed: 1, coverage: 77.8 },
          ]
        }
      ]
    },
    integration: {
      total: 84,
      passed: 61,
      failed: 8,
      skipped: 15,
      duration: '5m 23s',
      suites: [
        {
          name: 'API Integration',
          tests: 32,
          passed: 26,
          failed: 3,
          skipped: 3,
          coverage: 76.4,
          duration: '2m 10s',
          files: [
            { name: 'api.auth.integration.spec.js', passed: 8, failed: 1, coverage: 78.2 },
            { name: 'api.scale.integration.spec.js', passed: 10, failed: 1, coverage: 75.6 },
            { name: 'api.metrics.integration.spec.js', passed: 8, failed: 1, coverage: 75.3 },
          ]
        },
        {
          name: 'Database Integration',
          tests: 28,
          passed: 20,
          failed: 3,
          skipped: 5,
          coverage: 71.2,
          duration: '1m 45s',
          files: [
            { name: 'db.sessions.integration.spec.js', passed: 10, failed: 1, coverage: 72.8 },
            { name: 'db.metrics.integration.spec.js', passed: 10, failed: 2, coverage: 69.6 },
          ]
        },
        {
          name: 'WebSocket Integration',
          tests: 24,
          passed: 15,
          failed: 2,
          skipped: 7,
          coverage: 68.9,
          duration: '1m 28s',
          files: [
            { name: 'ws.telemetry.integration.spec.js', passed: 8, failed: 1, coverage: 70.3 },
            { name: 'ws.logs.integration.spec.js', passed: 7, failed: 1, coverage: 67.5 },
          ]
        }
      ]
    },
    e2e: {
      total: 48,
      passed: 33,
      failed: 5,
      skipped: 10,
      duration: '12m 34s',
      suites: [
        {
          name: 'User Journeys',
          tests: 20,
          passed: 15,
          failed: 2,
          skipped: 3,
          coverage: 72.1,
          duration: '5m 20s',
          scenarios: [
            { name: 'First Time Setup', status: 'passed', duration: '45s' },
            { name: 'Run Scale Test', status: 'passed', duration: '1m 12s' },
            { name: 'Generate Report', status: 'failed', duration: '38s', error: 'Timeout waiting for report generation' },
            { name: 'Configure Targets', status: 'passed', duration: '28s' },
            { name: 'View Live Telemetry', status: 'passed', duration: '52s' },
          ]
        },
        {
          name: 'Load Testing Scenarios',
          tests: 15,
          passed: 10,
          failed: 2,
          skipped: 3,
          coverage: 65.8,
          duration: '4m 48s',
          scenarios: [
            { name: 'Incremental RPS Test', status: 'passed', duration: '1m 30s' },
            { name: 'Burst Load Test', status: 'failed', duration: '1m 05s', error: 'Failed to handle burst at 10k RPS' },
            { name: 'Sustained Load Test', status: 'passed', duration: '2m 13s' },
          ]
        },
        {
          name: 'Threat Detection',
          tests: 13,
          passed: 8,
          failed: 1,
          skipped: 4,
          coverage: 63.2,
          duration: '2m 26s',
          scenarios: [
            { name: 'Dictionary Attack Simulation', status: 'passed', duration: '38s' },
            { name: 'Replay Attack Detection', status: 'passed', duration: '42s' },
            { name: 'DoS Attack Prevention', status: 'failed', duration: '1m 06s', error: 'Rate limiting not triggered' },
          ]
        }
      ]
    }
  };

  // Failed tests details
  const failedTests = [
    {
      suite: 'Authentication Module',
      test: 'should handle expired tokens correctly',
      file: 'auth.controller.spec.js',
      error: 'Expected status 401 but received 200',
      line: 142,
      type: 'unit'
    },
    {
      suite: 'RADIUS Protocol',
      test: 'should validate malformed packets',
      file: 'radius.attributes.spec.js',
      error: 'Malformed packet not rejected',
      line: 87,
      type: 'unit'
    },
    {
      suite: 'User Journeys',
      test: 'Generate Report',
      file: 'report.e2e.spec.js',
      error: 'Timeout waiting for report generation',
      line: 234,
      type: 'e2e'
    },
    {
      suite: 'Load Testing Scenarios',
      test: 'Burst Load Test',
      file: 'burst.e2e.spec.js',
      error: 'Failed to handle burst at 10k RPS',
      line: 156,
      type: 'e2e'
    },
  ];

  // Coverage trends (mock historical data)
  const coverageTrends = [
    { build: 'BUILD-1001', date: '2024-01-10', overall: 72.3, unit: 78.5, integration: 68.2, e2e: 62.1 },
    { build: 'BUILD-1002', date: '2024-01-11', overall: 74.8, unit: 80.2, integration: 70.1, e2e: 64.3 },
    { build: 'BUILD-1003', date: '2024-01-12', overall: 76.2, unit: 82.1, integration: 71.5, e2e: 65.8 },
    { build: 'BUILD-1004', date: '2024-01-13', overall: 77.9, unit: 84.3, integration: 72.2, e2e: 67.2 },
    { build: buildId, date: '2024-01-14', overall: 78.5, unit: 85.2, integration: 72.8, e2e: 68.4 },
  ];

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedSuite(isExpanded ? panel : false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <PassIcon sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'failed':
        return <FailIcon sx={{ color: 'error.main', fontSize: 20 }} />;
      case 'skipped':
        return <SkipIcon sx={{ color: 'warning.main', fontSize: 20 }} />;
      default:
        return null;
    }
  };

  const getCoverageColor = (coverage) => {
    if (coverage >= 80) return 'success';
    if (coverage >= 60) return 'warning';
    return 'error';
  };

  const calculatePassRate = (passed, total) => {
    return total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  };

  const handleExport = (format) => {
    console.log(`Exporting report as ${format}`);
    // Implement export functionality
  };

  const renderSummaryCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom variant="overline">
                  Overall Coverage
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {coverageData.overall}%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  <TrendIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  <Typography variant="caption" color="success.main">
                    +1.3% from last build
                  </Typography>
                </Box>
              </Box>
              <CircularProgress
                variant="determinate"
                value={coverageData.overall}
                size={60}
                thickness={4}
                sx={{
                  color: getCoverageColor(coverageData.overall) + '.main',
                  backgroundColor: 'grey.200',
                  borderRadius: '50%',
                }}
              />
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
                  Tests Passed
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                  312
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of 388 total tests
                </Typography>
              </Box>
              <Badge
                badgeContent={25}
                color="error"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
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
                  Test Duration
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  21m 39s
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All suites combined
                </Typography>
              </Box>
              <TimelineIcon sx={{ fontSize: 40, color: 'info.main' }} />
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
                  Pass Rate
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  80.4%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  <TrendDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
                  <Typography variant="caption" color="error.main">
                    -2.1% from last build
                  </Typography>
                </Box>
              </Box>
              <PerformanceIcon sx={{ fontSize: 40, color: 'warning.main' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTestSuiteDetails = (type, data) => (
    <Box>
      {data.suites.map((suite, index) => (
        <Accordion
          key={index}
          expanded={expandedSuite === `${type}-${index}`}
          onChange={handleAccordionChange(`${type}-${index}`)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
              <Typography sx={{ fontWeight: 600, flex: 1 }}>{suite.name}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  size="small"
                  label={`${suite.passed}/${suite.tests} passed`}
                  color={suite.failed > 0 ? 'error' : 'success'}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`${suite.coverage}% coverage`}
                  color={getCoverageColor(suite.coverage)}
                />
                <Typography variant="caption" color="text.secondary">
                  {suite.duration}
                </Typography>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {suite.files && (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>File</TableCell>
                      <TableCell align="center">Passed</TableCell>
                      <TableCell align="center">Failed</TableCell>
                      <TableCell align="center">Coverage</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {suite.files.map((file, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {file.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip size="small" label={file.passed} color="success" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          {file.failed > 0 ? (
                            <Chip size="small" label={file.failed} color="error" />
                          ) : (
                            <Chip size="small" label="0" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={file.coverage}
                              sx={{ flex: 1, height: 6 }}
                              color={getCoverageColor(file.coverage)}
                            />
                            <Typography variant="caption">{file.coverage}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {file.failed === 0 ? (
                            <PassIcon sx={{ color: 'success.main', fontSize: 20 }} />
                          ) : (
                            <FailIcon sx={{ color: 'error.main', fontSize: 20 }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {suite.scenarios && (
              <List>
                {suite.scenarios.map((scenario, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon>{getStatusIcon(scenario.status)}</ListItemIcon>
                    <ListItemText
                      primary={scenario.name}
                      secondary={
                        <Box>
                          <Typography variant="caption">Duration: {scenario.duration}</Typography>
                          {scenario.error && (
                            <Typography variant="caption" color="error" display="block">
                              Error: {scenario.error}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  const renderFailedTests = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: 'error.light' }}>
            <TableCell sx={{ fontWeight: 600, color: 'error.contrastText' }}>Suite</TableCell>
            <TableCell sx={{ fontWeight: 600, color: 'error.contrastText' }}>Test</TableCell>
            <TableCell sx={{ fontWeight: 600, color: 'error.contrastText' }}>File</TableCell>
            <TableCell sx={{ fontWeight: 600, color: 'error.contrastText' }}>Error</TableCell>
            <TableCell sx={{ fontWeight: 600, color: 'error.contrastText' }}>Type</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {failedTests.map((test, index) => (
            <TableRow key={index} hover>
              <TableCell>{test.suite}</TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {test.test}
                </Typography>
              </TableCell>
              <TableCell>
                <Tooltip title={`Line ${test.line}`}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', cursor: 'pointer' }}>
                    {test.file}:{test.line}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="error">
                  {test.error}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip size="small" label={test.type.toUpperCase()} variant="outlined" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderCoverageTrends = () => (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Build</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="center">Overall</TableCell>
              <TableCell align="center">Unit</TableCell>
              <TableCell align="center">Integration</TableCell>
              <TableCell align="center">E2E</TableCell>
              <TableCell align="center">Trend</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coverageTrends.map((trend, index) => (
              <TableRow key={index} hover selected={trend.build === buildId}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {trend.build}
                  </Typography>
                </TableCell>
                <TableCell>{trend.date}</TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={`${trend.overall}%`}
                    color={getCoverageColor(trend.overall)}
                  />
                </TableCell>
                <TableCell align="center">{trend.unit}%</TableCell>
                <TableCell align="center">{trend.integration}%</TableCell>
                <TableCell align="center">{trend.e2e}%</TableCell>
                <TableCell align="center">
                  {index > 0 && (
                    trend.overall > coverageTrends[index - 1].overall ? (
                      <TrendIcon sx={{ color: 'success.main' }} />
                    ) : (
                      <TrendDownIcon sx={{ color: 'error.main' }} />
                    )
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Test Coverage Report
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip label={`Build: ${buildId}`} size="small" />
            <Typography variant="body2" color="text.secondary">
              Generated: {reportTimestamp}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => setLoading(true)}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('html')}
          >
            Export HTML
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Alert for failed tests */}
      {failedTests.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Test Failures Detected</AlertTitle>
          {failedTests.length} tests failed across multiple suites. Review the Failed Tests tab for details.
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Unit Tests" icon={<CodeIcon />} iconPosition="start" />
          <Tab label="Integration Tests" icon={<ApiIcon />} iconPosition="start" />
          <Tab label="E2E Tests" icon={<SecurityIcon />} iconPosition="start" />
          <Tab label="Failed Tests" icon={<BugIcon />} iconPosition="start" />
          <Tab label="Coverage Trends" icon={<TrendIcon />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Unit Test Results</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Chip label={`${testSuites.unit.passed} passed`} color="success" />
                  <Chip label={`${testSuites.unit.failed} failed`} color="error" />
                  <Chip label={`${testSuites.unit.skipped} skipped`} color="warning" />
                  <Chip label={`Coverage: ${coverageData.unit}%`} color="primary" />
                </Box>
              </Box>
              {renderTestSuiteDetails('unit', testSuites.unit)}
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Integration Test Results</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Chip label={`${testSuites.integration.passed} passed`} color="success" />
                  <Chip label={`${testSuites.integration.failed} failed`} color="error" />
                  <Chip label={`${testSuites.integration.skipped} skipped`} color="warning" />
                  <Chip label={`Coverage: ${coverageData.integration}%`} color="primary" />
                </Box>
              </Box>
              {renderTestSuiteDetails('integration', testSuites.integration)}
            </Box>
          )}

          {tabValue === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">End-to-End Test Results</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Chip label={`${testSuites.e2e.passed} passed`} color="success" />
                  <Chip label={`${testSuites.e2e.failed} failed`} color="error" />
                  <Chip label={`${testSuites.e2e.skipped} skipped`} color="warning" />
                  <Chip label={`Coverage: ${coverageData.e2e}%`} color="primary" />
                </Box>
              </Box>
              {renderTestSuiteDetails('e2e', testSuites.e2e)}
            </Box>
          )}

          {tabValue === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Failed Tests ({failedTests.length})
              </Typography>
              {renderFailedTests()}
            </Box>
          )}

          {tabValue === 4 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Coverage Trends - Last 5 Builds
              </Typography>
              {renderCoverageTrends()}
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Coverage Breakdown
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Lines</Typography>
                      <Typography variant="h5">{coverageData.lines}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={85}
                        sx={{ mt: 1 }}
                        color="success"
                      />
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Branches</Typography>
                      <Typography variant="h5">{coverageData.branches}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={72}
                        sx={{ mt: 1 }}
                        color="warning"
                      />
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Functions</Typography>
                      <Typography variant="h5">{coverageData.functions}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={88}
                        sx={{ mt: 1 }}
                        color="success"
                      />
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Statements</Typography>
                      <Typography variant="h5">{coverageData.statements}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={79}
                        sx={{ mt: 1 }}
                        color="warning"
                      />
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Footer Summary */}
      <Paper sx={{ p: 2, mt: 3, bgcolor: 'grey.50' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Test Execution Summary</Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Total Test Suites"
                  secondary={`${testSuites.unit.suites.length + testSuites.integration.suites.length + testSuites.e2e.suites.length}`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Total Tests"
                  secondary={`${testSuites.unit.total + testSuites.integration.total + testSuites.e2e.total}`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Total Duration"
                  secondary="21m 39s"
                />
              </ListItem>
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Quality Metrics</Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Code Quality Score"
                  secondary="B+ (78.5%)"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Technical Debt"
                  secondary="2d 4h estimated"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Security Issues"
                  secondary="0 Critical, 2 Medium, 5 Low"
                />
              </ListItem>
            </List>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default TestCoverageReport;