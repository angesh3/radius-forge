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
  Checkbox,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Fab,
  Menu,
  Snackbar,
  Radio,
  RadioGroup,
  FormLabel,
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
  VisibilityOff as ViewOffIcon,
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Speed as SpeedIcon,
  NetworkCheck as NetworkIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  SwapHoriz as SwapIcon,
} from '@mui/icons-material';
import designSystem from '../theme/designSystem';

const { spacing, colors } = designSystem;

const TopologyInteractiveCorrected = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [viewMode, setViewMode] = useState('logical');
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [animateFlow, setAnimateFlow] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });
  const [editMode, setEditMode] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [radiusTarget, setRadiusTarget] = useState('access-manager'); // 'access-manager' or 'cisco-ise'
  
  // New node form state
  const [newNode, setNewNode] = useState({
    label: '',
    type: 'nad',
    status: 'healthy',
    icon: '🔀',
    x: 350,
    y: 250,
  });

  // Network topology data with enabled state
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
        enabled: true,
        required: true,
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
        enabled: true,
        required: false,
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
        enabled: true,
        required: false,
        metrics: {
          devices: 30,
          sessions: 523,
          throughput: '3.1 Gbps'
        }
      },
      {
        id: 'access-manager',
        label: 'Cisco Access Manager',
        type: 'server',
        x: 400,
        y: 200,
        status: 'healthy',
        icon: '🏢',
        enabled: true,
        required: false,
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
        enabled: false,
        required: false,
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
        enabled: true,
        required: false,
        metrics: {
          events: 1250,
          storage: '2.3 TB',
          retention: '90 days'
        }
      }
    ],
    connections: [
      { id: 'c1', from: 'traffic-gen', to: 'nad-cluster-a', protocol: 'RADIUS', active: true, enabled: true },
      { id: 'c2', from: 'traffic-gen', to: 'nad-cluster-b', protocol: 'RADIUS', active: true, enabled: true },
      // Dynamic connections based on radiusTarget
      { id: 'c3', from: 'nad-cluster-a', to: 'access-manager', protocol: 'RADIUS', active: true, enabled: true },
      { id: 'c4', from: 'nad-cluster-b', to: 'access-manager', protocol: 'RADIUS', active: true, enabled: true },
      { id: 'c5', from: 'nad-cluster-a', to: 'cisco-ise', protocol: 'RADIUS', active: false, enabled: false },
      { id: 'c6', from: 'nad-cluster-b', to: 'cisco-ise', protocol: 'RADIUS', active: false, enabled: false },
      { id: 'c7', from: 'access-manager', to: 'cisco-ise', protocol: 'pxGrid', active: false, enabled: false },
      { id: 'c8', from: 'nad-cluster-a', to: 'syslog-siem', protocol: 'Syslog', active: true, enabled: true },
      { id: 'c9', from: 'nad-cluster-b', to: 'syslog-siem', protocol: 'Syslog', active: true, enabled: true },
    ]
  });

  // Animation frame for connection flow
  const [animationFrame, setAnimationFrame] = useState(0);
  
  // Update connections based on RADIUS target selection
  useEffect(() => {
    setTopology(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => {
        if (node.id === 'access-manager') {
          return { ...node, enabled: radiusTarget === 'access-manager' };
        }
        if (node.id === 'cisco-ise') {
          return { ...node, enabled: radiusTarget === 'cisco-ise' };
        }
        return node;
      }),
      connections: prev.connections.map(conn => {
        // Enable/disable connections based on RADIUS target
        if ((conn.to === 'access-manager' && (conn.from === 'nad-cluster-a' || conn.from === 'nad-cluster-b'))) {
          return { ...conn, active: radiusTarget === 'access-manager', enabled: radiusTarget === 'access-manager' };
        }
        if ((conn.to === 'cisco-ise' && (conn.from === 'nad-cluster-a' || conn.from === 'nad-cluster-b'))) {
          return { ...conn, active: radiusTarget === 'cisco-ise', enabled: radiusTarget === 'cisco-ise' };
        }
        // pxGrid connection between Access Manager and ISE
        if (conn.from === 'access-manager' && conn.to === 'cisco-ise') {
          return { ...conn, active: false, enabled: false }; // Always disabled as they're alternatives
        }
        return conn;
      })
    }));
  }, [radiusTarget]);

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
        const isActive = conn.active && conn.enabled && fromNode.enabled && toNode.enabled;
        
        ctx.beginPath();
        ctx.moveTo(fromNode.x + 40, fromNode.y + 40);
        ctx.lineTo(toNode.x + 40, toNode.y + 40);
        
        if (isActive && animateFlow) {
          // Animated dashed line
          ctx.setLineDash([10, 5]);
          ctx.lineDashOffset = -animationFrame / 2;
          ctx.strokeStyle = colors.primary[700];
          ctx.lineWidth = 3;
        } else if (isActive) {
          ctx.setLineDash([]);
          ctx.strokeStyle = colors.primary[500];
          ctx.lineWidth = 2;
        } else {
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = colors.gray[300];
          ctx.lineWidth = 1;
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw protocol label
        if (isActive) {
          const midX = (fromNode.x + toNode.x) / 2 + 40;
          const midY = (fromNode.y + toNode.y) / 2 + 40;
          ctx.fillStyle = colors.gray[600];
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(conn.protocol, midX, midY - 5);
        }
      }
    });
    
    // Draw nodes
    topology.nodes.forEach(node => {
      // Skip disabled nodes if not in edit mode
      if (!editMode && !node.enabled) return;
      
      const opacity = node.enabled ? 1 : 0.4;
      ctx.globalAlpha = opacity;
      
      // Node background
      ctx.fillStyle = getNodeColor(node.status);
      ctx.fillRect(node.x, node.y, 80, 80);
      
      // Border - thicker for selected nodes
      ctx.strokeStyle = selectedNodes.includes(node.id) ? colors.primary[700] : colors.gray[400];
      ctx.lineWidth = selectedNodes.includes(node.id) ? 3 : 2;
      ctx.strokeRect(node.x, node.y, 80, 80);
      
      // Node icon
      ctx.font = '32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(node.icon, node.x + 40, node.y + 45);
      
      // Node label - wrap long text
      ctx.fillStyle = colors.gray[800];
      ctx.font = '11px Arial';
      const words = node.label.split(' ');
      if (words.length > 2) {
        ctx.fillText(words.slice(0, 2).join(' '), node.x + 40, node.y + 92);
        ctx.fillText(words.slice(2).join(' '), node.x + 40, node.y + 104);
      } else {
        ctx.fillText(node.label, node.x + 40, node.y + 95);
      }
      
      // Metrics
      if (showMetrics && node.metrics.rps && node.enabled) {
        ctx.fillStyle = colors.primary[700];
        ctx.font = '10px Arial';
        ctx.fillText(`${node.metrics.rps} RPS`, node.x + 40, node.y + 116);
      }
      
      // Status indicator
      ctx.beginPath();
      ctx.arc(node.x + 70, node.y + 10, 5, 0, 2 * Math.PI);
      ctx.fillStyle = node.enabled ? getStatusColor(node.status) : colors.gray[400];
      ctx.fill();
      
      // Primary/Optional/Required badges
      if (node.isPrimary && node.enabled) {
        ctx.fillStyle = colors.primary[700];
        ctx.fillRect(node.x, node.y - 15, 80, 15);
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.fillText('PRIMARY', node.x + 40, node.y - 3);
      } else if (node.isOptional) {
        ctx.fillStyle = colors.warning.main;
        ctx.fillRect(node.x, node.y - 15, 80, 15);
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.fillText('ALTERNATIVE', node.x + 40, node.y - 3);
      } else if (node.required) {
        ctx.fillStyle = colors.error.main;
        ctx.fillRect(node.x, node.y - 15, 80, 15);
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.fillText('REQUIRED', node.x + 40, node.y - 3);
      }
      
      // Disabled overlay
      if (!node.enabled) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(node.x, node.y, 80, 80);
        ctx.strokeStyle = colors.gray[500];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(node.x + 80, node.y + 80);
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
    });
    
    ctx.restore();
  }, [topology, zoom, animationFrame, animateFlow, showMetrics, editMode, selectedNodes, canvasSize]);

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
      if (editMode) {
        // Toggle selection in edit mode
        if (selectedNodes.includes(clickedNode.id)) {
          setSelectedNodes(prev => prev.filter(id => id !== clickedNode.id));
        } else {
          setSelectedNodes(prev => [...prev, clickedNode.id]);
        }
      } else {
        // Show details in view mode
        setSelectedNode(clickedNode);
        setDetailsOpen(true);
      }
    }
  };

  const handleToggleNode = (nodeId) => {
    // Don't allow toggling RADIUS servers directly - use the radio button instead
    if (nodeId === 'access-manager' || nodeId === 'cisco-ise') {
      setSnackbar({
        open: true,
        message: 'Use the RADIUS Target selector to switch between Access Manager and ISE',
        severity: 'info'
      });
      return;
    }

    setTopology(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { ...node, enabled: !node.enabled } : node
      ),
      connections: prev.connections.map(conn => {
        // Disable connections to/from disabled nodes
        const fromNode = prev.nodes.find(n => n.id === conn.from);
        const toNode = prev.nodes.find(n => n.id === conn.to);
        if (conn.from === nodeId || conn.to === nodeId) {
          return { ...conn, enabled: !prev.nodes.find(n => n.id === nodeId).enabled };
        }
        return conn;
      })
    }));
    
    setSnackbar({
      open: true,
      message: `Component ${topology.nodes.find(n => n.id === nodeId).enabled ? 'disabled' : 'enabled'}`,
      severity: 'success'
    });
  };

  const handleRadiusTargetChange = (event) => {
    const newTarget = event.target.value;
    setRadiusTarget(newTarget);
    
    setSnackbar({
      open: true,
      message: `RADIUS target switched to ${newTarget === 'access-manager' ? 'Cisco Access Manager' : 'Cisco ISE'}`,
      severity: 'success'
    });
    
    // Update configuration (in a real app, this would sync with backend)
    localStorage.setItem('radiusTarget', newTarget);
  };

  const handleAddNode = () => {
    const nodeId = `node-${Date.now()}`;
    const newNodeData = {
      ...newNode,
      id: nodeId,
      enabled: true,
      required: false,
      metrics: {
        rps: Math.floor(Math.random() * 1000),
        latency: `${Math.floor(Math.random() * 50)}ms`,
        cpu: Math.floor(Math.random() * 60)
      }
    };
    
    setTopology(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNodeData]
    }));
    
    setAddNodeOpen(false);
    setNewNode({
      label: '',
      type: 'nad',
      status: 'healthy',
      icon: '🔀',
      x: 350,
      y: 250,
    });
    
    setSnackbar({
      open: true,
      message: `Added new component: ${newNodeData.label}`,
      severity: 'success'
    });
  };

  const handleDeleteNodes = () => {
    if (selectedNodes.length === 0) return;
    
    // Check if any selected nodes are required
    const hasRequired = selectedNodes.some(id => 
      topology.nodes.find(n => n.id === id)?.required
    );
    
    if (hasRequired) {
      setSnackbar({
        open: true,
        message: 'Cannot delete required components',
        severity: 'error'
      });
      return;
    }
    
    setTopology(prev => ({
      nodes: prev.nodes.filter(node => !selectedNodes.includes(node.id)),
      connections: prev.connections.filter(conn => 
        !selectedNodes.includes(conn.from) && !selectedNodes.includes(conn.to)
      )
    }));
    
    setSelectedNodes([]);
    setSnackbar({
      open: true,
      message: `Deleted ${selectedNodes.length} component(s)`,
      severity: 'success'
    });
  };

  const handleZoomIn = () => setZoom(prev => Math.min(150, prev + 10));
  const handleZoomOut = () => setZoom(prev => Math.max(50, prev - 10));
  const handleZoomReset = () => setZoom(100);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getActiveComponentsCount = () => {
    return topology.nodes.filter(n => n.enabled).length;
  };

  const getTotalRPS = () => {
    return topology.nodes
      .filter(n => n.enabled && n.metrics.rps)
      .reduce((sum, n) => sum + n.metrics.rps, 0);
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
              {getActiveComponentsCount()} of {topology.nodes.length} components active • {getTotalRPS()} total RPS • 
              RADIUS Target: {radiusTarget === 'access-manager' ? 'Access Manager' : 'ISE'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={editMode ? 'contained' : 'outlined'}
              startIcon={editMode ? <SaveIcon /> : <EditIcon />}
              onClick={() => {
                setEditMode(!editMode);
                setSelectedNodes([]);
              }}
              size="small"
            >
              {editMode ? 'Save' : 'Edit'} Mode
            </Button>
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
              
              {editMode && (
                <>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => setAddNodeOpen(true)}
                    size="small"
                    variant="outlined"
                  >
                    Add
                  </Button>
                  <Button
                    startIcon={<DeleteIcon />}
                    onClick={handleDeleteNodes}
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={selectedNodes.length === 0}
                  >
                    Delete ({selectedNodes.length})
                  </Button>
                </>
              )}
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
                  cursor: editMode ? 'crosshair' : 'pointer',
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
                    <Box sx={{ width: 8, height: 8, bgcolor: colors.gray[400], borderRadius: '50%' }} />
                    <Typography variant="caption">Disabled</Typography>
                  </Box>
                </Box>
                {editMode && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                    Click nodes to select/deselect
                  </Typography>
                )}
              </Paper>
            </Box>

            {/* Components Panel */}
            {!isFullscreen && (
              <Paper sx={{ width: 320, overflow: 'auto', p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Network Components
                </Typography>
                
                {/* RADIUS Target Selection */}
                <Alert severity="info" sx={{ mb: 2 }}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ fontSize: '0.8rem', mb: 1 }}>
                      RADIUS Target Server
                    </FormLabel>
                    <RadioGroup
                      value={radiusTarget}
                      onChange={handleRadiusTargetChange}
                      row
                    >
                      <FormControlLabel 
                        value="access-manager" 
                        control={<Radio size="small" />} 
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption">Access Manager</Typography>
                            <Chip label="PRIMARY" size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                          </Box>
                        }
                      />
                      <FormControlLabel 
                        value="cisco-ise" 
                        control={<Radio size="small" />} 
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption">ISE</Typography>
                            <Chip label="ALT" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                          </Box>
                        }
                      />
                    </RadioGroup>
                  </FormControl>
                </Alert>
                
                <Divider sx={{ mb: 1 }} />
                
                <List dense>
                  {topology.nodes.map((node, index) => (
                    <React.Fragment key={node.id}>
                      <ListItem
                        sx={{
                          borderRadius: 1,
                          py: 1,
                          opacity: node.enabled ? 1 : 0.6,
                          bgcolor: selectedNodes.includes(node.id) ? colors.primary[50] : 'transparent',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Checkbox
                            checked={node.enabled}
                            onChange={() => handleToggleNode(node.id)}
                            disabled={node.required || node.id === 'access-manager' || node.id === 'cisco-ise'}
                            size="small"
                          />
                        </ListItemIcon>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Badge
                            color={
                              !node.enabled ? 'default' :
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
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 500,
                                  textDecoration: node.enabled ? 'none' : 'line-through',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {node.label}
                              </Typography>
                              {node.isPrimary && node.enabled && (
                                <Chip label="PRIMARY" size="small" sx={{ height: 14, fontSize: '0.6rem' }} />
                              )}
                              {node.isOptional && (
                                <Chip label="ALT" size="small" variant="outlined" sx={{ height: 14, fontSize: '0.6rem' }} />
                              )}
                              {node.required && (
                                <Chip label="REQ" size="small" color="error" sx={{ height: 14, fontSize: '0.6rem' }} />
                              )}
                            </Box>
                          }
                          secondary={
                            node.enabled && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {node.metrics.rps && `${node.metrics.rps} RPS`}
                                {node.metrics.latency && ` • ${node.metrics.latency}`}
                                {node.metrics.cpu && ` • CPU: ${node.metrics.cpu}%`}
                              </Typography>
                            )
                          }
                        />
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedNode(node);
                            setDetailsOpen(true);
                          }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
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

      {/* Add Node Dialog */}
      <Dialog open={addNodeOpen} onClose={() => setAddNodeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Component</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Component Name"
                fullWidth
                value={newNode.label}
                onChange={(e) => setNewNode(prev => ({ ...prev, label: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newNode.type}
                  label="Type"
                  onChange={(e) => setNewNode(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="nad">NAD Device</MenuItem>
                  <MenuItem value="server">Server</MenuItem>
                  <MenuItem value="generator">Traffic Generator</MenuItem>
                  <MenuItem value="logging">Logging System</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Icon</InputLabel>
                <Select
                  value={newNode.icon}
                  label="Icon"
                  onChange={(e) => setNewNode(prev => ({ ...prev, icon: e.target.value }))}
                >
                  <MenuItem value="🔀">🔀 Switch</MenuItem>
                  <MenuItem value="🏢">🏢 Server</MenuItem>
                  <MenuItem value="🚀">🚀 Generator</MenuItem>
                  <MenuItem value="📊">📊 Analytics</MenuItem>
                  <MenuItem value="🔐">🔐 Security</MenuItem>
                  <MenuItem value="☁️">☁️ Cloud</MenuItem>
                  <MenuItem value="🖥️">🖥️ Computer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="X Position"
                type="number"
                fullWidth
                value={newNode.x}
                onChange={(e) => setNewNode(prev => ({ ...prev, x: parseInt(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Y Position"
                type="number"
                fullWidth
                value={newNode.y}
                onChange={(e) => setNewNode(prev => ({ ...prev, y: parseInt(e.target.value) }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddNodeOpen(false)}>Cancel</Button>
          <Button onClick={handleAddNode} variant="contained" disabled={!newNode.label}>
            Add Component
          </Button>
        </DialogActions>
      </Dialog>

      {/* Node Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        {selectedNode && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4">{selectedNode.icon}</Typography>
                <Box>
                  <Typography variant="h6">{selectedNode.label}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={selectedNode.enabled ? 'ENABLED' : 'DISABLED'}
                      size="small"
                      color={selectedNode.enabled ? 'success' : 'default'}
                    />
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
                  {selectedNode.id === 'access-manager' ? 
                    'Cisco Access Manager is the primary AAA target for RadiusForge testing' :
                    selectedNode.id === 'cisco-ise' ?
                    'Cisco ISE is an alternative AAA target for extended integration testing' :
                    'This server is part of the AAA infrastructure'
                  }
                </Alert>
              )}
              
              {(selectedNode.id === 'access-manager' || selectedNode.id === 'cisco-ise') && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  NAD devices can only send RADIUS traffic to one target at a time. Use the RADIUS Target selector to switch between Access Manager and ISE.
                </Alert>
              )}
              
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={selectedNode.enabled} 
                      onChange={() => {
                        handleToggleNode(selectedNode.id);
                        setDetailsOpen(false);
                      }}
                      disabled={selectedNode.required || selectedNode.id === 'access-manager' || selectedNode.id === 'cisco-ise'}
                    />
                  }
                  label={selectedNode.enabled ? 'Enabled in Test Configuration' : 'Disabled in Test Configuration'}
                />
                {selectedNode.required && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                    This component is required and cannot be disabled
                  </Typography>
                )}
                {(selectedNode.id === 'access-manager' || selectedNode.id === 'cisco-ise') && (
                  <Typography variant="caption" color="info" sx={{ display: 'block', mt: 1 }}>
                    Use the RADIUS Target selector to enable/disable this server
                  </Typography>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
      />
    </Box>
  );
};

export default TopologyInteractiveCorrected;