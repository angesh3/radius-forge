import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  RocketLaunch as RocketIcon,
  Build as BuildIcon,
  Error as ErrorIcon,
  Calculate as CalculatorIcon,
  MenuBook as BookIcon,
  School as SchoolIcon,
  HelpOutline as HelpIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  ContentCopy as CopyIcon,
  Lightbulb as TipIcon,
} from '@mui/icons-material';

const HelpEnhanced = () => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAccordion, setExpandedAccordion] = useState('panel1');

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <RocketIcon />,
      color: 'primary'
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: <BuildIcon />,
      color: 'warning'
    },
    {
      id: 'common-errors',
      title: 'Common Errors',
      icon: <ErrorIcon />,
      color: 'error'
    },
    {
      id: 'capacity-planning',
      title: 'Capacity Planning',
      icon: <CalculatorIcon />,
      color: 'info'
    },
    {
      id: 'glossary',
      title: 'AAA Glossary',
      icon: <BookIcon />,
      color: 'success'
    },
    {
      id: 'best-practices',
      title: 'Best Practices',
      icon: <SchoolIcon />,
      color: 'secondary'
    }
  ];

  const errorCodes = [
    { code: 2, name: 'Access-Reject', description: 'Authentication failed', solution: 'Check credentials and shared secret', severity: 'error' },
    { code: 3, name: 'Access-Challenge', description: 'Additional auth required', solution: 'Normal for EAP methods', severity: 'info' },
    { code: 11, name: 'Access-Accept', description: 'Authentication successful', solution: 'No action needed', severity: 'success' },
    { code: 40, name: 'CoA-Request', description: 'Change of Authorization', solution: 'Verify CoA support on NAS', severity: 'warning' },
    { code: 44, name: 'CoA-NAK', description: 'CoA request denied', solution: 'Check session ID and attributes', severity: 'error' },
  ];

  const glossaryTerms = [
    { term: 'AAA', definition: 'Authentication, Authorization, and Accounting - Core network security services' },
    { term: 'RADIUS', definition: 'Remote Authentication Dial-In User Service - Protocol for AAA services' },
    { term: 'EAP', definition: 'Extensible Authentication Protocol - Framework for authentication methods' },
    { term: 'NAD', definition: 'Network Access Device - Equipment that provides network access (switches, routers)' },
    { term: 'PSN', definition: 'Policy Service Node - ISE node that processes authentication requests' },
    { term: 'MAB', definition: 'MAC Authentication Bypass - Authentication using device MAC address' },
    { term: 'CoA', definition: 'Change of Authorization - Dynamic policy changes for active sessions' },
    { term: 'VSA', definition: 'Vendor Specific Attributes - Custom RADIUS attributes by vendors' },
    { term: 'pxGrid', definition: 'Platform Exchange Grid - Cisco protocol for sharing contextual information' },
    { term: 'RPS', definition: 'Requests Per Second - Measure of system throughput' },
  ];

  const capacityEstimates = [
    { scale: '150 RPS', sockets: '10-20', cpu: '2 cores', memory: '4 GB', network: '10 Mbps' },
    { scale: '1,000 RPS', sockets: '50-100', cpu: '4 cores', memory: '8 GB', network: '100 Mbps' },
    { scale: '5,000 RPS', sockets: '200-500', cpu: '8 cores', memory: '16 GB', network: '1 Gbps' },
    { scale: '10,000 RPS', sockets: '500-1000', cpu: '16 cores', memory: '32 GB', network: '2 Gbps' },
    { scale: '50,000 RPS', sockets: '2000-5000', cpu: '32 cores', memory: '64 GB', network: '10 Gbps' },
    { scale: '100,000 RPS', sockets: '5000-10000', cpu: '64+ cores', memory: '128 GB', network: '10+ Gbps' },
  ];

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderGettingStarted = () => (
    <Box>
      <Accordion expanded={expandedAccordion === 'panel1'} onChange={handleAccordionChange('panel1')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Quick Start Guide</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ pl: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
              1. Configure Your Target
            </Typography>
            <Typography variant="body1" paragraph sx={{ color: 'text.primary' }}>
              Navigate to Scale Test and configure your target system:
            </Typography>
            <List sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 1 }}>
              <ListItem>
                <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                <ListItemText primary="Enter the host/IP address (e.g., 192.168.1.10)" />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                <ListItemText primary="Set port 1812 for Auth, 1813 for Accounting" />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                <ListItemText primary="Configure the shared secret" />
              </ListItem>
            </List>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 2, color: 'primary.main' }}>
              2. Select Traffic Profile
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>Traffic Type</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>RADIUS, TACACS+, Syslog</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>Auth Type</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>EAP-TLS, MAB, PEAP, PAP</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>RPS Profile</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Incremental, Step, Burst</Typography>
                </Paper>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              <AlertTitle>Pro Tip</AlertTitle>
              Start with low RPS (150-500) for initial validation, then gradually increase to your target load.
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expandedAccordion === 'panel2'} onChange={handleAccordionChange('panel2')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>First Test Checklist</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>Before Your First Test</AlertTitle>
              Complete these checks to ensure a successful test run.
            </Alert>
            
            <List>
              {[
                'Verify network connectivity to target system',
                'Confirm shared secret is correct',
                'Start with low RPS (150-500) for validation',
                'Ensure target system can handle planned load',
                'Check firewall rules for RADIUS ports (1812/1813)',
                'Verify NAD configuration'
              ].map((item, index) => (
                <ListItem key={index} sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 1 }}>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={item}
                    primaryTypographyProps={{ color: 'text.primary', fontWeight: 500 }}
                  />
                </ListItem>
              ))}
            </List>

            <Paper sx={{ p: 2, mt: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Recommended First Test Configuration:
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography variant="body2">• Target: Access Manager (192.168.1.10)</Typography>
                <Typography variant="body2">• Auth Type: PAP (simplest)</Typography>
                <Typography variant="body2">• RPS: 150 (lowest preset)</Typography>
                <Typography variant="body2">• Duration: 60-120 seconds</Typography>
                <Typography variant="body2">• Clients: 5-10</Typography>
              </Box>
            </Paper>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  const renderTroubleshooting = () => (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
        Common RADIUS Error Codes
      </Typography>
      
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Solution</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {errorCodes.map((error) => (
              <TableRow key={error.code} hover>
                <TableCell>
                  <Chip 
                    label={error.code} 
                    size="small" 
                    color={error.severity}
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell sx={{ color: 'text.primary', fontWeight: 500 }}>{error.name}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{error.description}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{error.solution}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="info" icon={<TipIcon />}>
        <AlertTitle>Debugging Tip</AlertTitle>
        Enable debug logging on your RADIUS server to see detailed authentication flow and attribute processing.
      </Alert>
    </Box>
  );

  const renderCapacityPlanning = () => (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
        Capacity Planning Calculator
      </Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.dark' }}>
              <TableCell sx={{ fontWeight: 600, color: 'primary.contrastText' }}>Scale</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'primary.contrastText' }}>Sockets</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'primary.contrastText' }}>CPU</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'primary.contrastText' }}>Memory</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'primary.contrastText' }}>Network</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {capacityEstimates.map((row) => (
              <TableRow key={row.scale} hover>
                <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{row.scale}</TableCell>
                <TableCell sx={{ color: 'text.primary' }}>{row.sockets}</TableCell>
                <TableCell sx={{ color: 'text.primary' }}>{row.cpu}</TableCell>
                <TableCell sx={{ color: 'text.primary' }}>{row.memory}</TableCell>
                <TableCell sx={{ color: 'text.primary' }}>{row.network}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="warning" sx={{ mt: 3 }}>
        <AlertTitle>Important Note</AlertTitle>
        These are estimates. Actual requirements depend on authentication complexity, packet size, and server performance.
      </Alert>
    </Box>
  );

  const renderGlossary = () => (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
        AAA Terminology
      </Typography>
      
      <Grid container spacing={2}>
        {glossaryTerms.map((item) => (
          <Grid item xs={12} sm={6} key={item.term}>
            <Card sx={{ height: '100%', '&:hover': { boxShadow: 3 } }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {item.term}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                  {item.definition}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderContent = () => {
    switch(activeSection) {
      case 'getting-started':
        return renderGettingStarted();
      case 'troubleshooting':
      case 'common-errors':
        return renderTroubleshooting();
      case 'capacity-planning':
        return renderCapacityPlanning();
      case 'glossary':
        return renderGlossary();
      default:
        return renderGettingStarted();
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
          Help & Documentation
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Everything you need to know about RadiusForge
        </Typography>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search help topics..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <Grid container spacing={3}>
        {/* Navigation */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                Topics
              </Typography>
              <List>
                {filteredSections.map((section) => (
                  <ListItemButton
                    key={section.id}
                    selected={activeSection === section.id}
                    onClick={() => setActiveSection(section.id)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '& .MuiListItemIcon-root': {
                          color: 'primary.contrastText',
                        },
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        }
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {section.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={section.title}
                      primaryTypographyProps={{
                        fontWeight: activeSection === section.id ? 600 : 400
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Content */}
        <Grid item xs={12} md={9}>
          <Card>
            <CardContent>
              {renderContent()}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HelpEnhanced;