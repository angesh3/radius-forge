import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Assessment as ReportIcon,
  Hub as TopologyIcon,
  History as HistoryIcon,
  Help as HelpIcon,
  Settings as SettingsIcon,
  ViewList as LogsIcon,
  ExpandLess,
  ExpandMore,
  Person as PersonIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';
import Logo from './Logo';

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 72;

const Layout = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [testingMenuOpen, setTestingMenuOpen] = useState(true);
  const [monitoringMenuOpen, setMonitoringMenuOpen] = useState(true);
  
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navigationItems = [
    {
      section: 'Monitoring',
      items: [
        {
          path: '/',
          name: 'Dashboard',
          icon: DashboardIcon,
          description: 'System Overview & KPIs'
        },
        {
          path: '/live-logs',
          name: 'Live Logs',
          icon: LogsIcon,
          description: 'Real-time Log Streaming'
        },
        {
          path: '/configuration',
          name: 'Configuration',
          icon: SettingsIcon,
          description: 'System Configuration'
        },
        {
          path: '/quick-test',
          name: 'Quick Test',
          icon: SpeedIcon,
          description: 'Instant Authentication Validation'
        }
      ]
    },
    {
      section: 'Testing Tools',
      items: [
        {
          path: '/scale-test',
          name: 'Scale Test',
          icon: SpeedIcon,
          description: 'RPS Planner & Load Testing'
        },
        {
          path: '/performance-test',
          name: 'Performance Test',
          icon: DashboardIcon,
          description: 'SLO Benchmark Suite'
        },
        {
          path: '/threat-generator',
          name: 'Threat Generator',
          icon: SecurityIcon,
          description: 'Adversarial Traffic Modules'
        }
      ]
    },
    {
      section: 'Analysis',
      items: [
        {
          path: '/report',
          name: 'Reports',
          icon: ReportIcon,
          description: 'Generate & Distribute Reports'
        },
        {
          path: '/topology',
          name: 'Topology',
          icon: TopologyIcon,
          description: 'Network Visualization'
        },
        {
          path: '/history',
          name: 'History',
          icon: HistoryIcon,
          description: 'Run Catalog & Comparisons'
        }
      ]
    },
    {
      section: 'Support',
      items: [
        {
          path: '/help',
          name: 'Help',
          icon: HelpIcon,
          description: 'Documentation & Guides'
        }
      ]
    }
  ];

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Logo variant={drawerOpen ? 'full' : 'icon'} size="medium" />
      </Box>
      
      <List sx={{ flexGrow: 1, px: 1, py: 2 }}>
        {navigationItems.map((section) => (
          <Box key={section.section}>
            {drawerOpen && (
              <Typography
                variant="overline"
                sx={{
                  px: 2,
                  py: 1,
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {section.section}
              </Typography>
            )}
            
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    selected={active}
                    sx={{
                      borderRadius: 1.5,
                      mx: 1,
                      minHeight: 48,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'primary.contrastText',
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: drawerOpen ? 40 : 'auto',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon />
                    </ListItemIcon>
                    {drawerOpen && (
                      <ListItemText
                        primary={item.name}
                        secondary={item.description}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: active ? 600 : 500,
                        }}
                        secondaryTypographyProps={{
                          fontSize: '0.75rem',
                          sx: { 
                            color: active ? 'primary.contrastText' : 'text.secondary',
                            opacity: active ? 0.8 : 1
                          }
                        }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
            
            {section !== navigationItems[navigationItems.length - 1] && (
              <Divider sx={{ my: 2, mx: 2 }} />
            )}
          </Box>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: isMobile ? '100%' : `calc(100% - ${drawerOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED}px)`,
          ml: isMobile ? 0 : `${drawerOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED}px`,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2, display: isMobile ? 'inline-flex' : 'none' }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={<Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'success.main',
                }}
              />}
              label="System Healthy"
              variant="outlined"
              size="small"
              sx={{ 
                color: 'success.main',
                borderColor: 'success.main',
                '& .MuiChip-icon': { ml: 1 }
              }}
            />
            
            <IconButton
              onClick={handleUserMenuOpen}
              sx={{ p: 0 }}
            >
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  width: 32,
                  height: 32,
                  fontSize: '0.875rem'
                }}
              >
                A
              </Avatar>
            </IconButton>
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleUserMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleUserMenuClose}>
                <ListItemIcon>
                  <AccountIcon fontSize="small" />
                </ListItemIcon>
                Profile
              </MenuItem>
              <MenuItem onClick={handleUserMenuClose}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                Settings
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleUserMenuClose}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: isMobile ? 0 : (drawerOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED),
          flexShrink: 0,
        }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? drawerOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
              boxSizing: 'border-box',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${isMobile ? 0 : (drawerOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED)}px)`,
          bgcolor: 'background.default',
          overflow: 'auto',
          mt: 8, // Account for AppBar height
          maxWidth: '100%',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: '100%' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;