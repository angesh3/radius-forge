import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Switch,
  FormControlLabel,
  Alert,
  Tooltip,
  Badge,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

const LiveLogs = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [logLevel, setLogLevel] = useState('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [maxLogs, setMaxLogs] = useState(1000);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  const logContainerRef = useRef(null);
  const logCountRef = useRef(0);


  useEffect(() => {
    // Initialize with empty logs - real logs will come from WebSocket
    setLogs([]);
    setFilteredLogs([]);
  }, []);

  // Remove mock logs - connect to real WebSocket
  useEffect(() => {
    let ws = null;
    
    if (isStreaming && !isPaused) {
      setConnectionStatus('connecting');
      ws = new WebSocket(`ws://localhost:8910/ws/logs`);
      
      ws.onopen = () => {
        setConnectionStatus('connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const logEntry = JSON.parse(event.data);
          setLogs(prevLogs => {
            const updatedLogs = [logEntry, ...prevLogs].slice(0, maxLogs);
            return updatedLogs;
          });
        } catch (error) {
          console.error('Error parsing log message:', error);
        }
      };
      
      ws.onclose = () => {
        setConnectionStatus('disconnected');
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };
    } else {
      setConnectionStatus(isStreaming ? 'paused' : 'disconnected');
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [isStreaming, isPaused, maxLogs]);

  useEffect(() => {
    // Filter logs based on search term and log level
    let filtered = logs;
    
    if (logLevel !== 'ALL') {
      filtered = filtered.filter(log => log.level === logLevel);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredLogs(filtered);
  }, [logs, searchTerm, logLevel]);

  useEffect(() => {
    // Auto-scroll to top when new logs arrive
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [filteredLogs, autoScroll]);


  const handleStartStreaming = () => {
    setIsStreaming(true);
    setIsPaused(false);
  };

  const handlePauseStreaming = () => {
    setIsPaused(!isPaused);
  };

  const handleStopStreaming = () => {
    setIsStreaming(false);
    setIsPaused(false);
  };

  const handleClearLogs = () => {
    setLogs([]);
    setFilteredLogs([]);
    logCountRef.current = 0;
  };

  const handleExportLogs = () => {
    const logData = filteredLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      source: log.source,
      message: log.message,
      details: log.details,
    }));
    
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radiusforge-logs-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogIcon = (level) => {
    switch (level) {
      case 'ERROR':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'WARNING':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'SUCCESS':
        return <SuccessIcon sx={{ color: 'success.main' }} />;
      case 'INFO':
      default:
        return <InfoIcon sx={{ color: 'info.main' }} />;
    }
  };

  const getLogColor = (level) => {
    switch (level) {
      case 'ERROR':
        return 'error';
      case 'WARNING':
        return 'warning';
      case 'SUCCESS':
        return 'success';
      case 'INFO':
      default:
        return 'info';
    }
  };

  const getConnectionStatusChip = () => {
    const status = {
      connected: { label: 'Live', color: 'success', icon: '🟢' },
      paused: { label: 'Paused', color: 'warning', icon: '⏸️' },
      disconnected: { label: 'Stopped', color: 'default', icon: '🔴' },
    };
    
    const current = status[connectionStatus];
    return (
      <Chip
        icon={<span>{current.icon}</span>}
        label={current.label}
        color={current.color}
        size="small"
        variant="outlined"
      />
    );
  };

  return (
    <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Live Logs
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time log streaming and monitoring
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getConnectionStatusChip()}
          <Badge badgeContent={filteredLogs.length} color="primary" max={9999}>
            <Typography variant="body2" color="text.secondary">
              Total Logs
            </Typography>
          </Badge>
        </Box>
      </Box>

      {/* Controls */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            {/* Streaming Controls */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {!isStreaming ? (
                <Button
                  variant="contained"
                  startIcon={<PlayIcon />}
                  onClick={handleStartStreaming}
                  color="success"
                >
                  Start
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    startIcon={isPaused ? <PlayIcon /> : <PauseIcon />}
                    onClick={handlePauseStreaming}
                    color="warning"
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<StopIcon />}
                    onClick={handleStopStreaming}
                    color="error"
                  >
                    Stop
                  </Button>
                </>
              )}
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* Search and Filter */}
            <TextField
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
              }}
              sx={{ minWidth: 200 }}
            />

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Log Level</InputLabel>
              <Select
                value={logLevel}
                label="Log Level"
                onChange={(e) => setLogLevel(e.target.value)}
              >
                <MenuItem value="ALL">All Levels</MenuItem>
                <MenuItem value="ERROR">Error</MenuItem>
                <MenuItem value="WARNING">Warning</MenuItem>
                <MenuItem value="SUCCESS">Success</MenuItem>
                <MenuItem value="INFO">Info</MenuItem>
              </Select>
            </FormControl>

            <Divider orientation="vertical" flexItem />

            {/* Options */}
            <FormControlLabel
              control={
                <Switch
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  size="small"
                />
              }
              label="Auto-scroll"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={showTimestamp}
                  onChange={(e) => setShowTimestamp(e.target.checked)}
                  size="small"
                />
              }
              label="Timestamp"
            />

            <Divider orientation="vertical" flexItem />

            {/* Actions */}
            <Tooltip title="Clear all logs">
              <IconButton onClick={handleClearLogs} color="error">
                <ClearIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Export logs">
              <IconButton onClick={handleExportLogs} color="primary">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      {/* Log Stream */}
      <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 0 }}>
          {filteredLogs.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'text.secondary',
              }}
            >
              {isStreaming && !isPaused ? (
                <>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="h6">Waiting for logs...</Typography>
                  <Typography variant="body2">
                    Live log streaming is active. New entries will appear here.
                  </Typography>
                </>
              ) : (
                <>
                  <InfoIcon sx={{ fontSize: 48, mb: 2 }} />
                  <Typography variant="h6">No logs to display</Typography>
                  <Typography variant="body2">
                    {searchTerm || logLevel !== 'ALL' 
                      ? 'No logs match the current filters' 
                      : 'Start log streaming to see real-time entries'}
                  </Typography>
                </>
              )}
            </Box>
          ) : (
            <Box
              ref={logContainerRef}
              sx={{
                height: '100%',
                overflow: 'auto',
                backgroundColor: '#1a1a1a',
                fontFamily: 'monospace',
                color: '#e0e0e0',
              }}
            >
              <List dense sx={{ py: 0 }}>
                {filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <ListItem
                      sx={{
                        display: 'block',
                        py: 1,
                        px: 2,
                        backgroundColor: log.level === 'ERROR' ? 'rgba(244, 67, 54, 0.1)' : 
                                       log.level === 'WARNING' ? 'rgba(255, 152, 0, 0.1)' :
                                       log.level === 'SUCCESS' ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1 }}>
                        {showTimestamp && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#9e9e9e',
                              fontFamily: 'monospace',
                              minWidth: 80,
                              fontSize: '0.75rem',
                            }}
                          >
                            {log.timestamp.toLocaleTimeString()}
                          </Typography>
                        )}
                        
                        <Chip
                          icon={getLogIcon(log.level)}
                          label={log.level}
                          size="small"
                          color={getLogColor(log.level)}
                          variant="filled"
                          sx={{ 
                            minWidth: 80,
                            fontWeight: 600,
                            '& .MuiChip-label': { color: '#fff' }
                          }}
                        />
                        
                        <Chip
                          label={log.source}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            minWidth: 80,
                            color: '#64b5f6',
                            borderColor: '#64b5f6',
                            '& .MuiChip-label': { color: '#64b5f6' }
                          }}
                        />
                        
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#ffffff',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            flexGrow: 1,
                          }}
                        >
                          {log.message}
                        </Typography>
                      </Box>
                      
                      {log.details && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#b0b0b0',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            ml: showTimestamp ? 12 : 8,
                            display: 'block',
                          }}
                        >
                          {log.details}
                        </Typography>
                      )}
                    </ListItem>
                    <Divider variant="fullWidth" sx={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Status Bar */}
      <Paper
        sx={{
          mt: 1,
          p: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'background.paper',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Showing {filteredLogs.length} of {logs.length} logs
          {searchTerm && ` (filtered by "${searchTerm}")`}
          {logLevel !== 'ALL' && ` (${logLevel} level)`}
        </Typography>
        
        <Typography variant="caption" color="text.secondary">
          Max logs: {maxLogs} | Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
        </Typography>
      </Paper>
    </Box>
  );
};

export default LiveLogs;
