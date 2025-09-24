import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Badge,
  Slider,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import {
  Computer as ClientIcon,
  Router as RouterIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Refresh as RefreshIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Timeline as TimelineIcon,
  DeviceHub as HubIcon,
  Visibility as ViewIcon,
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Speed as SpeedIcon,
  NetworkCheck as NetworkIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
} from '@mui/icons-material';

const TopologyEnhanced = () => {
  const canvasRef = useRef(null);
  const [viewMode, setViewMode] = useState('logical');
  const [selectedNode, setSelectedNode] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [animateFlow, setAnimateFlow] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Network topology data
  const [topology, setTopology] = useState({
    nodes: [
      {
        id: 'traffic-gen',
        label: 'Traffic Generator',
        type: 'generator',
        x: 100,
        y: 250,
        status: 'active',
        icon: '🚀',
        metrics: {
          rps: 5247,
          connections: 128,
          cpu: 45
        }
      },
      {
        id: 'nad-cluster-a',
        label: 'NAD Cluster A',
        type: 'nad',
        x: 300,
        y: 150,
        status: 'healthy',
        icon: '🔀',
        metrics: {
          devices: 25,
          sessions: 450,
          throughput: '2.3 Gbps'
        }
      },
      {
        id: 'nad-cluster-b',
        label: 'NAD Cluster B',
        type: 'nad',
        x: 300,
        y: 350,
        status: 'healthy',
        icon: '🔀',
        metrics: {
          devices: 30,
          sessions: 523,
          throughput: '3.1 Gbps'
        }
      },
      {
        id: 'asset-manager',
        label: 'Asset Manager',
        type: 'server',
        x: 500,
        y: 250,
        status: 'healthy',
        icon: '🏢',
        isPrimary: true,
        metrics: {
          rps: 4850,
          latency: '12ms',
          cpu: 62
        }
      },
      {
        id: 'cisco-ise',
        label: 'Cisco ISE',
        type: 'server',
        x: 700,
        y: 250,
        status: 'warning',
        icon: '🔐',
        isOptional: true,
        metrics: {
          rps: 450,
          latency: '85ms',
          cpu: 78
        }
      },
      {
        id: 'syslog-siem',
        label: 'Syslog/SIEM',
        type: 'logging',
        x: 500,
        y: 450,
        status: 'healthy',
        icon: '📊',
        metrics: {
          events: 1250,
          storage: '2.3 TB',
          retention: '90 days'
        }
      }
    ],
    connections: [
      { from: 'traffic-gen', to: 'nad-cluster-a', protocol: 'RADIUS', active: true },
      { from: 'traffic-gen', to: 'nad-cluster-b', protocol: 'RADIUS', active: true },
      { from: 'nad-cluster-a', to: 'asset-manager', protocol: 'RADIUS', active: true },
      { from: 'nad-cluster-b', to: 'asset-manager', protocol: 'RADIUS', active: true },
      { from: 'asset-manager', to: 'cisco-ise', protocol: 'pxGrid', active: false },
      { from: 'nad-cluster-a', to: 'syslog-siem', protocol: 'Syslog', active: true },
      { from: 'nad-cluster-b', to: 'syslog-siem', protocol: 'Syslog', active: true },
    ]
  });

  // Animation frame for connection flow
  const [animationFrame, setAnimationFrame] = useState(0);
  
  useEffect(() => {
    if (animateFlow) {
      const interval = setInterval(() => {
        setAnimationFrame(prev => (prev + 1) % 100);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [animateFlow]);

  // Simulate network traffic
  useEffect(() => {
    if (isSimulating) {
      const interval = setInterval(() => {
        setTopology(prev => ({
          ...prev,
          nodes: prev.nodes.map(node => ({
            ...node,
            metrics: {
              ...node.metrics,
              rps: node.metrics.rps ? 
                Math.floor(node.metrics.rps * (0.9 + Math.random() * 0.2)) : 
                node.metrics.rps,
              cpu: node.metrics.cpu ? 
                Math.min(95, Math.max(10, node.metrics.cpu + (Math.random() - 0.5) * 10)) : 
                node.metrics.cpu
            }
          }))
        }));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isSimulating]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply zoom
    ctx.save();
    ctx.scale(zoom / 100, zoom / 100);
    
    // Draw connections
    topology.connections.forEach(conn => {
      const fromNode = topology.nodes.find(n => n.id === conn.from);
      const toNode = topology.nodes.find(n => n.id === conn.to);
      
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x + 40, fromNode.y + 40);
        ctx.lineTo(toNode.x + 40, toNode.y + 40);
        
        if (conn.active && animateFlow) {
          // Animated dashed line
          ctx.setLineDash([10, 5]);
          ctx.lineDashOffset = -animationFrame / 2;
          ctx.strokeStyle = '#1565C0';
          ctx.lineWidth = 3;
        } else {
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = conn.active ? '#90CAF9' : '#E0E0E0';
          ctx.lineWidth = 2;
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw protocol label
        const midX = (fromNode.x + toNode.x) / 2 + 40;
        const midY = (fromNode.y + toNode.y) / 2 + 40;
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(conn.protocol, midX, midY - 5);
      }
    });
    
    // Draw nodes
    topology.nodes.forEach(node => {
      // Node background
      ctx.fillStyle = getNodeColor(node.status);
      ctx.fillRect(node.x, node.y, 80, 80);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(node.x, node.y, 80, 80);
      
      // Node icon
      ctx.font = '32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(node.icon, node.x + 40, node.y + 45);
      
      // Node label
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.fillText(node.label, node.x + 40, node.y + 95);
      
      // Metrics
      if (showMetrics && node.metrics.rps) {
        ctx.fillStyle = '#1565C0';
        ctx.font = '10px Arial';
        ctx.fillText(`${node.metrics.rps} RPS`, node.x + 40, node.y + 108);
      }
      
      // Status indicator
      ctx.beginPath();
      ctx.arc(node.x + 70, node.y + 10, 5, 0, 2 * Math.PI);
      ctx.fillStyle = getStatusColor(node.status);
      ctx.fill();
      
      // Primary/Optional badge
      if (node.isPrimary) {
        ctx.fillStyle = '#1565C0';
        ctx.fillRect(node.x, node.y - 15, 80, 15);
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.fillText('PRIMARY', node.x + 40, node.y - 3);
      }
      if (node.isOptional) {
        ctx.fillStyle = '#FFA726';
        ctx.fillRect(node.x, node.y - 15, 80, 15);
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.fillText('OPTIONAL', node.x + 40, node.y - 3);
      }
    });
    
    ctx.restore();
  }, [topology, zoom, animationFrame, animateFlow, showMetrics]);

  const getNodeColor = (status) => {
    switch(status) {
      case 'healthy': return '#E8F5E9';
      case 'warning': return '#FFF3E0';
      case 'error': return '#FFEBEE';
      case 'active': return '#E3F2FD';
      default: return '#F5F5F5';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'healthy': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'error': return '#F44336';
      case 'active': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (100 / zoom);
    const y = (e.clientY - rect.top) * (100 / zoom);
    
    // Check if click is on a node
    const clickedNode = topology.nodes.find(node => 
      x >= node.x && x <= node.x + 80 &&
      y >= node.y && y <= node.y + 80
    );
    
    if (clickedNode) {
      setSelectedNode(clickedNode);
      setDetailsOpen(true);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(200, prev + 10));
  const handleZoomOut = () => setZoom(prev => Math.max(50, prev - 10));
  const handleZoomReset = () => setZoom(100);

  const MetricCard = ({ icon: Icon, label, value, color = 'primary' }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
      <Icon sx={{ fontSize: 20, color: `${color}.main` }} />
      <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{value}</Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Network Topology
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Interactive visualization of RadiusForge network architecture
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={isSimulating ? 'contained' : 'outlined'}
            startIcon={isSimulating ? <StopIcon /> : <PlayIcon />}
            onClick={() => setIsSimulating(!isSimulating)}
            color={isSimulating ? 'error' : 'primary'}
          >
            {isSimulating ? 'Stop Simulation' : 'Start Simulation'}
          </Button>
          <IconButton onClick={() => window.location.reload()}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, v) => v && setViewMode(v)}
              size="small"
            >
              <ToggleButton value="logical">Logical</ToggleButton>
              <ToggleButton value="physical">Physical</ToggleButton>
              <ToggleButton value="flow">Flow</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          
          <Grid item>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={handleZoomOut} size="small">
                <ZoomOutIcon />
              </IconButton>
              <Chip label={`${zoom}%`} size="small" />
              <IconButton onClick={handleZoomIn} size="small">
                <ZoomInIcon />
              </IconButton>
              <IconButton onClick={handleZoomReset} size="small">
                <CenterIcon />
              </IconButton>
            </Box>
          </Grid>
          
          <Grid item>
            <FormControlLabel
              control={<Switch checked={animateFlow} onChange={(e) => setAnimateFlow(e.target.checked)} />}
              label="Animate Flow"
            />
          </Grid>
          
          <Grid item>
            <FormControlLabel
              control={<Switch checked={showMetrics} onChange={(e) => setShowMetrics(e.target.checked)} />}
              label="Show Metrics"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content */}
      <Grid container spacing={3} sx={{ flex: 1 }}>
        {/* Canvas */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', position: 'relative' }}>
            <CardContent sx={{ height: '100%', p: 0 }}>
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                style={{
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer',
                  backgroundColor: '#FAFAFA'
                }}
              />
              
              {/* Legend */}
              <Paper sx={{ position: 'absolute', bottom: 16, left: 16, p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Legend</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: '#4CAF50', borderRadius: '50%' }} />
                    <Typography variant="caption">Healthy</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: '#FF9800', borderRadius: '50%' }} />
                    <Typography variant="caption">Warning</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: '#F44336', borderRadius: '50%' }} />
                    <Typography variant="caption">Error</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: '#2196F3', borderRadius: '50%' }} />
                    <Typography variant="caption">Active</Typography>
                  </Box>
                </Box>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        {/* Node List */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Network Components
              </Typography>
              
              <List>
                {topology.nodes.map((node, index) => (
                  <React.Fragment key={node.id}>
                    <ListItem
                      button
                      onClick={() => {
                        setSelectedNode(node);
                        setDetailsOpen(true);
                      }}
                      sx={{
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <ListItemIcon>
                        <Badge
                          color={
                            node.status === 'healthy' ? 'success' :
                            node.status === 'warning' ? 'warning' :
                            node.status === 'error' ? 'error' : 'info'
                          }
                          variant="dot"
                        >
                          <Typography variant="h5">{node.icon}</Typography>
                        </Badge>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {node.label}
                            </Typography>
                            {node.isPrimary && (
                              <Chip label="PRIMARY" size="small" color="primary" />
                            )}
                            {node.isOptional && (
                              <Chip label="OPTIONAL" size="small" variant="outlined" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            {node.metrics.rps && (
                              <Typography variant="caption" color="text.secondary">
                                {node.metrics.rps} RPS
                              </Typography>
                            )}
                            {node.metrics.latency && (
                              <Typography variant="caption" color="text.secondary">
                                {' • '}{node.metrics.latency}
                              </Typography>
                            )}
                            {node.metrics.cpu && (
                              <Typography variant="caption" color="text.secondary">
                                {' • CPU: '}{node.metrics.cpu}%
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < topology.nodes.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Node Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        {selectedNode && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h3">{selectedNode.icon}</Typography>
                <Box>
                  <Typography variant="h6">{selectedNode.label}</Typography>
                  <Chip
                    label={selectedNode.status.toUpperCase()}
                    size="small"
                    color={
                      selectedNode.status === 'healthy' ? 'success' :
                      selectedNode.status === 'warning' ? 'warning' :
                      selectedNode.status === 'error' ? 'error' : 'info'
                    }
                  />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                {Object.entries(selectedNode.metrics).map(([key, value]) => (
                  <Grid item xs={6} key={key}>
                    <MetricCard
                      icon={
                        key === 'rps' ? SpeedIcon :
                        key === 'cpu' ? SecurityIcon :
                        key === 'latency' ? TimelineIcon :
                        NetworkIcon
                      }
                      label={key.toUpperCase()}
                      value={value}
                    />
                  </Grid>
                ))}
              </Grid>
              
              {selectedNode.type === 'server' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {selectedNode.isPrimary ? 
                    'This is the primary AAA target for RadiusForge testing' :
                    selectedNode.isOptional ?
                    'This server is optional and used for extended integration testing' :
                    'This server is part of the AAA infrastructure'
                  }
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default TopologyEnhanced;