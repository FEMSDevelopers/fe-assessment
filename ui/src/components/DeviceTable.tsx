import { useEffect, useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, CircularProgress, Chip, Alert, Paper, Typography, IconButton, LinearProgress } from '@mui/material';
import mqtt from 'mqtt';
import { PlayArrow, Pause, Refresh } from '@mui/icons-material';

interface DeviceData {
  id: string;
  name: string;
  time?: number;
  temp?: number;
  hum?: number;
  lastUpdated?: number;
}

const DeviceTable = () => {
  // State for device data using Record type for O(1) lookups by deviceId
  const [devices, setDevices] = useState<Record<string, DeviceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [isPaused, setIsPaused] = useState(false);
  const [connectionProgress, setConnectionProgress] = useState(0);

  // Grid column definitions with custom cell renderers for formatting
  const columns: GridColDef[] = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 90,
      renderCell: (params) => (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          height: '100%'
        }}>
          <Typography sx={{ 
            fontWeight: 'bold', 
            color: 'primary.main',
            fontSize: '0.875rem'
          }}>
            #{params.row.id}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'name', 
      headerName: 'Device Name', 
      width: 150,
      renderCell: (params) => (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          height: '100%'
        }}>
          <Typography sx={{ 
            fontWeight: 500,
            fontSize: '0.875rem'
          }}>
            {params.row.name}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'time', 
      headerName: 'Last Update Time', 
      width: 200,
      renderCell: (params) => (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          height: '100%'
        }}>
          <Typography sx={{ 
            fontSize: '0.875rem',
            color: 'text.secondary'
          }}>
            {new Date(params.row.time || 0).toLocaleString()}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'temp', 
      headerName: 'Temperature', 
      width: 150,
      renderCell: (params) => (
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            color: params.row.temp > 30 ? 'error.main' : 'success.main',
            fontWeight: 500
          }}
          data-testid={`temp-cell-${params.row.id}`}
        >
          {params.row.temp !== undefined ? (
            `${params.row.temp.toFixed(1)}°C`
          ) : (
            <CircularProgress size={16} />
          )}
        </Box>
      )
    },
    { 
      field: 'hum', 
      headerName: 'Humidity', 
      width: 150,
      renderCell: (params) => (
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            color: 'info.main',
            fontWeight: 500
          }}
          data-testid={`hum-cell-${params.row.id}`}
        >
          {params.row.hum !== undefined ? (
            `${params.row.hum.toFixed(1)}%`
          ) : (
            <CircularProgress size={16} />
          )}
        </Box>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        const timeDiff = Date.now() - (params.row.time || 0);
        return (
          <Chip 
            label={timeDiff < 10000 ? 'Live' : 'Stale'}
            color={timeDiff < 10000 ? 'success' : 'warning'}
            size="small"
            sx={{ 
              fontWeight: 'bold',
              animation: timeDiff < 10000 ? 'pulse 2s infinite' : 'none'
            }}
          />
        );
      }
    }
  ];

  // MQTT connection and subscription management
  useEffect(() => {
    // Initialize MQTT client with WebSocket connection
    const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
      keepalive: 60,
      clean: true,
      connectTimeout: 30 * 1000,
      reconnectPeriod: 1000
    });

    // Device topics for subscription
    const topics = [
      'device/1/battery',
      'device/2/battery',
      'device/3/battery',
      'device/4/battery'
    ];

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnectionStatus('connected');
      // Subscribe to all device topics on connection
      topics.forEach(topic => client.subscribe(topic));
      setIsLoading(false);
    });

    // Handle incoming MQTT messages and update device state
    client.on('message', (topic, message) => {
      const deviceId = topic.split('/')[1];
      const data = JSON.parse(message.toString());
      
      // Update devices state with new data while preserving existing state
      setDevices(prev => ({
        ...prev,
        [deviceId]: {
          id: deviceId,
          name: `Device ${deviceId}`,
          ...data,
          lastUpdated: Date.now()
        }
      }));
      setLastUpdate(Date.now());
    });

    // Cleanup MQTT connection on component unmount
    return () => {
      client.end();
    };
  }, []);

  // Update current time every second for "last updated" displays
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Simulated connection progress
  useEffect(() => {
    if (isLoading && connectionStatus === 'connecting') {
      const interval = setInterval(() => {
        setConnectionProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isLoading, connectionStatus]);

  // Reset progress when connection is established
  useEffect(() => {
    if (connectionStatus === 'connected') {
      setConnectionProgress(100);
    }
  }, [connectionStatus]);

  const handlePlayPause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    fetch('http://localhost:3000/api/publish/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !newPausedState })
    });
  };

  const WelcomeOverlay = () => (
    <Box sx={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'white',
      zIndex: 2,
      gap: 3
    }}>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 500 }}>
        Device Monitor
      </Typography>
      
      <Box sx={{ width: '300px', textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Connecting to MQTT broker...
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={connectionProgress} 
          sx={{ 
            height: 8, 
            borderRadius: 4,
            mb: 2
          }} 
        />
        <Typography variant="caption" color="text.secondary">
          {connectionProgress < 100 ? 'Establishing connection...' : 'Connected!'}
        </Typography>
      </Box>

      <CircularProgress size={40} />
    </Box>
  );

  return (
    <Box sx={{ width: '100%', p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2, position: 'relative' }}>
        {/* Header section with controls */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom color="primary" sx={{ fontWeight: 500 }}>
              Device Monitor
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip
                label={`Status: ${connectionStatus}`}
                color={
                  connectionStatus === 'connected' ? 'success' :
                  connectionStatus === 'connecting' ? 'warning' : 'error'
                }
                sx={{ fontWeight: 'bold' }}
              />
              {connectionStatus === 'connected' && (
                <Chip
                  label={`Last update: ${Math.max(0, Math.floor((currentTime - lastUpdate) / 1000))}s ago`}
                  color="info"
                  sx={{ fontWeight: 'bold' }}
                />
              )}
            </Box>
          </Box>

          {/* Playback controls */}
          {connectionStatus === 'connected' && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton 
                onClick={handlePlayPause}
                color="primary"
                size="large"
                sx={{ 
                  backgroundColor: 'primary.light',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                  }
                }}
              >
                {isPaused ? <PlayArrow /> : <Pause />}
              </IconButton>
              <IconButton 
                onClick={() => window.location.reload()}
                color="primary"
                size="large"
                sx={{ 
                  backgroundColor: 'primary.light',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                  }
                }}
              >
                <Refresh />
              </IconButton>
            </Box>
          )}
        </Box>

        {connectionStatus === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Connection error. Please refresh the page.
          </Alert>
        )}

        {/* Data grid section */}
        <Box sx={{ 
          height: 400, 
          width: '100%', 
          position: 'relative',
          '& .MuiDataGrid-root': {
            border: 'none',
            backgroundColor: 'white',
            borderRadius: 1,
            '& .MuiDataGrid-cell': {
              borderColor: 'rgba(224, 224, 224, 0.4)',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center'
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'primary.light',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              minHeight: '56px'
            },
            '& .MuiDataGrid-row': {
              '&:nth-of-type(even)': {
                backgroundColor: 'rgba(0, 0, 0, 0.02)'
              },
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            },
            '& .MuiDataGrid-columnHeader': {
              padding: '0 16px'
            }
          }
        }}>
          {isLoading ? <WelcomeOverlay /> : null}
          <DataGrid
            rows={Object.values(devices)}
            columns={columns}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            autoHeight
            sx={{
              '& .MuiDataGrid-cell': {
                animation: 'fadeIn 0.5s'
              },
              '@keyframes fadeIn': {
                '0%': { opacity: 0.5 },
                '100%': { opacity: 1 }
              },
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.7 },
                '100%': { opacity: 1 }
              }
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default DeviceTable; 