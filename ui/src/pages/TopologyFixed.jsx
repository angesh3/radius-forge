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
  FormControlLabel,
  Switch,
  Alert,
  Container,
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
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import designSystem from '../theme/designSystem';

const { spacing, colors } = designSystem;

const TopologyFixed = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [viewMode, setViewMode] = useState('logical');
  const [selectedNode, setSelectedNode] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [animateFlow, setAnimateFlow] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });
  
  // Network topology data
  const [topology, setTopology] = useState({
    nodes: [
      {
        id: 'traffic-gen',
        label: 'Traffic Generator',
        type: 'generator',
        x: 50,
        y: 200,
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
        x: 200,
        y: 100,
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
        x: 200,
        y: 300,
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
        x: 400,
        y: 200,
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
        x: 600,
        y: 200,
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
        x: 400,
        y: 350,
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
  
  // Update canvas size when container changes
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: Math.min(rect.width - 32, 1200),
          height: Math.min(rect.height - 100, 500)
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    if (animateFlow) {
      const interval = setInterval(() => {
        setAnimationFrame(prev => (prev + 1) % 100);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [animateFlow]);

  // Fetch real network topology data
  useEffect(() => {
    if (isSimulating) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/topology/metrics');
          const data = await response.json();
          if (data.nodes) {
            setTopology(prev => ({
              ...prev,
              nodes: prev.nodes.map(node => {
                const updatedNode = data.nodes.find(n => n.id === node.id);
                return updatedNode ? { ...node, metrics: updatedNode.metrics } : node;
              })
            }));
          }
        } catch (error) {
          console.error('Failed to fetch topology metrics:', error);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isSimulating]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply zoom
    ctx.save();
    const scale = zoom / 100;
    ctx.scale(scale, scale);
    
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
          ctx.strokeStyle = colors.primary[700];
          ctx.lineWidth = 3;
        } else {
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = conn.active ? colors.primary[300] : colors.gray[300];
          ctx.lineWidth = 2;
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw protocol label
        const midX = (fromNode.x + toNode.x) / 2 + 40;
        const midY = (fromNode.y + toNode.y) / 2 + 40;
        ctx.fillStyle = colors.gray[600];
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
      ctx.strokeStyle = colors.gray[400];
      ctx.lineWidth = 2;
      ctx.strokeRect(node.x, node.y, 80, 80);
      
      // Node icon
      ctx.font = '32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(node.icon, node.x + 40, node.y + 45);
      
      // Node label
      ctx.fillStyle = colors.gray[800];
      ctx.font = '12px Arial';
      ctx.fillText(node.label, node.x + 40, node.y + 95);
      
      // Metrics
      if (showMetrics && node.metrics.rps) {
        ctx.fillStyle = colors.primary[700];
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
        ctx.fillStyle = colors.primary[700];
        ctx.fillRect(node.x, node.y - 15, 80, 15);
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.fillText('PRIMARY', node.x + 40, node.y - 3);
      }
      if (node.isOptional) {
        ctx.fillStyle = colors.warning.main;
        ctx.fillRect(node.x, node.y - 15, 80, 15);
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.fillText('OPTIONAL', node.x + 40, node.y - 3);
      }
    });
    
    ctx.restore();
  }, [topology, zoom, animationFrame, animateFlow, showMetrics, canvasSize]);

  const getNodeColor = (status) => {
    switch(status) {
      case 'healthy': return colors.success.light;
      case 'warning': return colors.warning.light;
      case 'error': return colors.error.light;
      case 'active': return colors.info.light;
      default: return colors.gray[100];
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'healthy': return colors.success.main;
      case 'warning': return colors.warning.main;
      case 'error': return colors.error.main;
      case 'active': return colors.info.main;
      default: return colors.gray[500];
    }
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = zoom / 100;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
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

  const handleZoomIn = () => setZoom(prev => Math.min(150, prev + 10));
  const handleZoomOut = () => setZoom(prev => Math.max(50, prev - 10));
  const handleZoomReset = () => setZoom(100);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Container maxWidth={false} sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        {/* Compact Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Network Topology
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Interactive visualization of RadiusForge network architecture
            </Typography>
          </Box>
          <Button
            variant={isSimulating ? 'contained' : 'outlined'}
            startIcon={isSimulating ? <StopIcon /> : <PlayIcon />}
            onClick={() => setIsSimulating(!isSimulating)}
            color={isSimulating ? 'error' : 'primary'}
            size="small"
          >
            {isSimulating ? 'Stop' : 'Start'} Simulation
          </Button>
        </Box>

        {/* Horizontal Layout */}
        <Paper sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Controls Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton onClick={handleZoomOut} size="small">
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
                <Chip label={`${zoom}%`} size="small" sx={{ minWidth: 50 }} />
                <IconButton onClick={handleZoomIn} size="small">
                  <ZoomInIcon fontSize="small" />
                </IconButton>
                <IconButton onClick={handleZoomReset} size="small">
                  <CenterIcon fontSize="small" />
                </IconButton>
              </Box>
              
              <FormControlLabel
                control={<Switch checked={animateFlow} onChange={(e) => setAnimateFlow(e.target.checked)} size="small" />}
                label="Animate"
                sx={{ m: 0 }}
              />
              
              <FormControlLabel
                control={<Switch checked={showMetrics} onChange={(e) => setShowMetrics(e.target.checked)} size="small" />}
                label="Metrics"
                sx={{ m: 0 }}
              />
            </Box>
            
            <IconButton onClick={toggleFullscreen} size="small">
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Box>

          {/* Canvas and Components Side by Side */}
          <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>
            {/* Canvas Container */}
            <Box ref={containerRef} sx={{ flex: 1, position: 'relative', bgcolor: colors.gray[50], borderRadius: 1, overflow: 'hidden' }}>
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                style={{
                  cursor: 'pointer',
                  display: 'block',
                  margin: 'auto'
                }}
              />
              
              {/* Legend Overlay */}
              <Paper sx={{ position: 'absolute', bottom: 8, left: 8, p: 1, opacity: 0.9 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Status</Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, bgcolor: colors.success.main, borderRadius: '50%' }} />
                    <Typography variant="caption">Healthy</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, bgcolor: colors.warning.main, borderRadius: '50%' }} />
                    <Typography variant="caption">Warning</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, bgcolor: colors.error.main, borderRadius: '50%' }} />
                    <Typography variant="caption">Error</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, bgcolor: colors.info.main, borderRadius: '50%' }} />
                    <Typography variant="caption">Active</Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>

            {/* Components Panel */}
            {!isFullscreen && (
              <Paper sx={{ width: 320, overflow: 'auto', p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Network Components
                </Typography>
                
                <List dense>
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
                          py: 1,
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Badge
                            color={
                              node.status === 'healthy' ? 'success' :
                              node.status === 'warning' ? 'warning' :
                              node.status === 'error' ? 'error' : 'info'
                            }
                            variant="dot"
                          >
                            <Typography variant="h6">{node.icon}</Typography>
                          </Badge>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {node.label}
                              </Typography>
                              {node.isPrimary && (
                                <Chip label="PRIMARY" size="small" sx={{ height: 16, fontSize: '0.65rem' }} />
                              )}
                              {node.isOptional && (
                                <Chip label="OPTIONAL" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.65rem' }} />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {node.metrics.rps && `${node.metrics.rps} RPS`}
                              {node.metrics.latency && ` • ${node.metrics.latency}`}
                              {node.metrics.cpu && ` • CPU: ${node.metrics.cpu}%`}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < topology.nodes.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            )}
          </Box>
        </Paper>
      </Container>

      {/* Node Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        {selectedNode && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4">{selectedNode.icon}</Typography>
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
                    <Paper sx={{ p: 1.5, bgcolor: colors.gray[50] }}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                        {key}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {value}
                      </Typography>
                    </Paper>
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

export default TopologyFixed;
