import { useEffect, useState, Suspense } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, CircularProgress, Chip, Alert, Paper, Typography, IconButton, LinearProgress, keyframes } from '@mui/material';
import mqtt from 'mqtt';
import { PlayArrow, Pause, Refresh } from '@mui/icons-material';
import { useMQTTConnection } from '../hooks/useMQTTConnection';
import { deviceApi } from '../api/deviceApi';
import { GridContainer, DashboardContainer } from './styled';
import { getDeviceColumns } from './DeviceGridColumns';
import { Fade } from '@mui/material';
import SensorsIcon from '@mui/icons-material/Sensors';
import { DEVICE_TOPICS } from '../types';

interface DeviceData {
  id: string;
  name: string;
  time?: number;
  temp?: number;
  hum?: number;
  lastUpdated?: number;
}

// Add these keyframes
const pulseAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
`;

const fadeInAnimation = keyframes`
  0% { background-color: rgba(76, 175, 80, 0.1); }
  100% { background-color: transparent; }
`;

// Move WelcomeOverlay component definition before it's used
const WelcomeOverlay = ({ connectionProgress }: { connectionProgress: number }) => (
  <Fade in={true} timeout={1000} unmountOnExit>
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
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(4px)',
      zIndex: 2,
      gap: 3
    }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        gap: 2 
      }}>
        <Box sx={{ 
          position: 'relative',
          width: 80,
          height: 80,
          mb: 2
        }}>
          <CircularProgress
            size={80}
            thickness={2}
            sx={{
              position: 'absolute',
              color: 'primary.light'
            }}
          />
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}>
            <SensorsIcon color="primary" sx={{ fontSize: 40 }} />
          </Box>
        </Box>

        <Typography variant="h4" color="primary" sx={{ 
          fontWeight: 500,
          textAlign: 'center',
          mb: 1
        }}>
          Device Monitor
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Initializing IoT Dashboard
        </Typography>
      </Box>
      
      <Box sx={{ 
        width: '300px', 
        textAlign: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        p: 3,
        borderRadius: 2,
        boxShadow: 1
      }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {connectionProgress < 100 ? 'Connecting to MQTT broker...' : 'Connected!'}
        </Typography>
        
        <LinearProgress 
          variant="determinate" 
          value={connectionProgress} 
          sx={{ 
            height: 6, 
            borderRadius: 3,
            mb: 1,
            mt: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              backgroundImage: 'linear-gradient(45deg, #4CAF50 30%, #81C784 90%)',
            }
          }} 
        />

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          mt: 1
        }}>
          <Typography variant="caption" color="text.secondary">
            {connectionProgress}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {connectionProgress < 100 ? 'Establishing connection...' : 'Ready!'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mt: 2,
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {DEVICE_TOPICS.map((topic, index) => (
          <Chip
            key={topic}
            label={`Device ${index + 1}`}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ 
              opacity: connectionProgress > (index + 1) * 25 ? 1 : 0.5,
              transition: 'opacity 0.3s ease-in-out'
            }}
          />
        ))}
      </Box>
    </Box>
  </Fade>
);

// Initial loading component using WelcomeOverlay
const InitialLoadingState = () => (
  <Box sx={{ 
    width: '100%', 
    height: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#f5f5f5'
  }}>
    <WelcomeOverlay connectionProgress={0} />
  </Box>
);

// Main component wrapper
const DeviceTableWrapper = () => (
  <Suspense fallback={<InitialLoadingState />}>
    <DeviceTable />
  </Suspense>
);

const DeviceTable = () => {
  const { 
    devices, 
    isLoading, 
    connectionStatus, 
    lastUpdate,
    isPaused,
    togglePause 
  } = useMQTTConnection();
  
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
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
            fontWeight: 500,
            padding: '4px 8px',
            borderRadius: 1,
            animation: `${fadeInAnimation} 1s ease-out`
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

  // Keep these effects
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    if (connectionStatus === 'connected') {
      setConnectionProgress(100);
    }
  }, [connectionStatus]);

  const handlePlayPause = () => {
    togglePause(!isPaused);
  };

  const LiveIndicator = () => (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 1,
      animation: `${pulseAnimation} 2s infinite`
    }}>
      <Box sx={{ 
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: 'success.main'
      }} />
      <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>
        Live Data
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2, position: 'relative' }}>
        {/* Use Fade for smooth transitions */}
        <Fade in={isLoading || Object.keys(devices).length === 0} timeout={500} unmountOnExit>
          <Box sx={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}>
            <WelcomeOverlay connectionProgress={connectionProgress} />
          </Box>
        </Fade>

        {/* Content with fade in */}
        <Fade in={!isLoading && Object.keys(devices).length > 0} timeout={500}>
          <Box>
            {/* Header section with controls */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="h4" color="primary" sx={{ fontWeight: 500 }}>
                    Device Monitor
                  </Typography>
                  {!isLoading && !isPaused && <LiveIndicator />}
                </Box>
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
                  },
                  transition: 'background-color 0.3s ease'
                },
                '& .MuiDataGrid-columnHeader': {
                  padding: '0 16px'
                }
              }
            }}>
              <DataGrid
                rows={Object.values(devices)}
                columns={columns}
                getRowId={(row) => row.id}
                disableRowSelectionOnClick
                autoHeight
                loading={Object.keys(devices).length === 0}
                sx={{
                  '& .MuiDataGrid-cell': {
                    animation: `${fadeInAnimation} 1s ease-out`,
                  },
                  '& .MuiDataGrid-row': {
                    '&:nth-of-type(even)': {
                      backgroundColor: 'rgba(0, 0, 0, 0.02)'
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    },
                    transition: 'background-color 0.3s ease'
                  },
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.7 },
                    '100%': { opacity: 1 }
                  }
                }}
              />
            </Box>
          </Box>
        </Fade>
      </Paper>
    </Box>
  );
};

export default DeviceTableWrapper; 