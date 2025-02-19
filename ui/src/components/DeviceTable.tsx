import { useEffect, useState, Suspense } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, CircularProgress, Chip, Alert, Paper, Typography, IconButton, LinearProgress, keyframes } from '@mui/material';
import mqtt from 'mqtt';
import { PlayArrow, Pause, Refresh, TrendingUp, TrendingDown } from '@mui/icons-material';
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
  prevTemp?: number;
  hum?: number;
  prevHum?: number;
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
          Connecting to MQTT broker...
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

// Add a utility function for conversion
const celsiusToFahrenheit = (celsius: number) => (celsius * 9/5) + 32;

const DeviceTable = () => {
  const { devices, isLoading, connectionStatus, lastUpdate, isPaused, togglePause } = useMQTTConnection();
  
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [connectionProgress, setConnectionProgress] = useState(0);

  // Grid column definitions with custom cell renderers for formatting
  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 100,
    },
    {
      field: 'name',
      headerName: 'Device Name',
      width: 150,
    },
    { 
      field: 'temp',
      headerName: 'Temperature (°C)',
      width: 150,
      renderCell: (params) => `${params.row.temp.toFixed(1)}°C`
    },
    { 
      field: 'hum',
      headerName: 'Humidity (%)',
      width: 150,
      renderCell: (params) => `${params.row.hum.toFixed(1)}%`
    },
    {
      field: 'time',
      headerName: 'Last Update Time',
      width: 200,
      valueFormatter: (params) => {
        return new Date(params.value as number).toLocaleString();
      }
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

  // Show loading state
  if (isLoading) {
    return (
      <Box sx={{ width: '100%', textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Initializing IoT Dashboard
        </Typography>
        <Typography color="text.secondary">
          Connecting to MQTT broker...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <DataGrid
        rows={Object.values(devices)}
        columns={columns}
        autoHeight
        disableRowSelectionOnClick
        getRowId={(row) => row.id}
        initialState={{
          pagination: { paginationModel: { pageSize: 100 } },
          columns: {
            columnVisibilityModel: {
              id: true,
              name: true,
              temp: true,
              hum: true
            }
          }
        }}
        hideFooter
      />
    </Box>
  );
};

export default DeviceTableWrapper; 