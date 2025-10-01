import React, { useState, useEffect } from 'react';
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Computer as ClientIcon,
  Router as RouterIcon,
  Security as RadiusIcon,
  Storage as DirectoryIcon,
  Cloud as CloudIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Timeline as FlowIcon,
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

const Topology = () => {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState('logical'); // logical, physical, flow

  useEffect(() => {
    const fetchTopologyData = async () => {
      try {
        const response = await fetch('/api/topology/nodes');
        const data = await response.json();
        setNodes(data.nodes || []);
      } catch (error) {
        console.error('Failed to fetch topology data:', error);
        setNodes([]);
      }
    };

    fetchTopologyData();
  }, []);

  const getNodeIcon = (type) => {
    switch (type) {
      case 'client': return ClientIcon;
      case 'nas': return RouterIcon;
      case 'radius': return RadiusIcon;
      case 'directory': return DirectoryIcon;
      case 'monitoring': return CloudIcon;
      default: return RouterIcon;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <HealthyIcon sx={{ color: 'success.main' }} />;
      case 'warning': return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'error': return <ErrorIcon sx={{ color: 'error.main' }} />;
      default: return <HealthyIcon sx={{ color: 'success.main' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    setDialogOpen(true);
  };

  const NodeCard = ({ node }) => {
    const IconComponent = getNodeIcon(node.type);
    
    return (
      <Card 
        sx={{ 
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 4
          }
        }}
        onClick={() => handleNodeClick(node)}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: 'primary.main',
                  color: 'white',
                }}
              >
                <IconComponent />
              </Box>
              <Box>
                <Typography variant="h6" component="div">
                  {node.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {node.description}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getStatusIcon(node.status)}
              <Chip
                label={node.status}
                color={getStatusColor(node.status)}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={2}>
            {Object.entries(node.metrics).map(([key, value]) => (
              <Grid item xs={4} key={key}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {value}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const ConnectionFlow = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FlowIcon />
        Authentication Flow
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {['Client', 'NAS', 'ISE Primary', 'Active Directory'].map((step, index, array) => (
          <React.Fragment key={step}>
            <Chip
              label={step}
              color={index === 0 ? 'primary' : 'default'}
              variant={index === 0 ? 'filled' : 'outlined'}
            />
            {index < array.length - 1 && (
              <Box sx={{ 
                width: 40, 
                height: 2, 
                backgroundColor: 'primary.main',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  right: 0,
                  top: -3,
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid',
                  borderLeftColor: 'primary.main',
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                }
              }} />
            )}
          </React.Fragment>
        ))}
      </Box>
    </Paper>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Network Topology
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Visual representation of RADIUS infrastructure and components
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>View Mode</InputLabel>
            <Select
              value={viewMode}
              label="View Mode"
              onChange={(e) => setViewMode(e.target.value)}
            >
              <MenuItem value="logical">Logical</MenuItem>
              <MenuItem value="physical">Physical</MenuItem>
              <MenuItem value="flow">Flow</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<RefreshIcon />}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Authentication Flow */}
      {viewMode === 'flow' && <ConnectionFlow />}

      {/* Node Grid */}
      <Grid container spacing={3}>
        {nodes.map((node) => (
          <Grid item xs={12} md={6} lg={4} key={node.id}>
            <NodeCard node={node} />
          </Grid>
        ))}
      </Grid>

      {/* Network Health Summary */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Network Health Summary
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                {nodes.filter(n => n.status === 'healthy').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Healthy Nodes
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                {nodes.filter(n => n.status === 'warning').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Warning Nodes
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main" sx={{ fontWeight: 600 }}>
                {nodes.filter(n => n.status === 'error').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Error Nodes
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 600 }}>
                {nodes.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Nodes
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Node Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedNode && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'primary.main',
                    color: 'white',
                  }}
                >
                  {React.createElement(getNodeIcon(selectedNode.type))}
                </Box>
                <Box>
                  <Typography variant="h6">{selectedNode.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedNode.description}
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto' }}>
                  <Chip
                    label={selectedNode.status}
                    color={getStatusColor(selectedNode.status)}
                    icon={getStatusIcon(selectedNode.status)}
                  />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Metrics
                  </Typography>
                  <List>
                    {Object.entries(selectedNode.metrics).map(([key, value]) => (
                      <ListItem key={key} disablePadding>
                        <ListItemText
                          primary={key.charAt(0).toUpperCase() + key.slice(1)}
                          secondary={value}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Details
                  </Typography>
                  <List>
                    {Object.entries(selectedNode.details).map(([key, value]) => (
                      <ListItem key={key} disablePadding>
                        <ListItemText
                          primary={key.charAt(0).toUpperCase() + key.slice(1)}
                          secondary={Array.isArray(value) ? value.join(', ') : value}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
              <Button variant="contained" startIcon={<ViewIcon />}>
                View Logs
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Topology;
