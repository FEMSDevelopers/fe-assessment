import { useEffect, useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, CircularProgress, Chip, Alert, Paper, Typography } from '@mui/material';
import mqtt from 'mqtt';

interface DeviceData {
  id: string;
  name: string;
  time?: number;
  temp?: number;
  hum?: number;
  lastUpdated?: number;
}

const DeviceTable = () => {
  const [devices, setDevices] = useState<Record<string, DeviceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  const columns: GridColDef[] = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 90,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          #{params.row.id}
        </Typography>
      )
    },
    { 
      field: 'name', 
      headerName: 'Device Name', 
      width: 150,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 500 }}>
          {params.row.name}
        </Typography>
      )
    },
    { 
      field: 'time', 
      headerName: 'Last Update Time', 
      width: 200,
      renderCell: (params) => (
        <Typography>
          {new Date(params.row.time || 0).toLocaleString()}
        </Typography>
      )
    },
    { 
      field: 'temp', 
      headerName: 'Temperature', 
      width: 150,
      renderCell: (params) => (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          color: params.row.temp > 30 ? 'error.main' : 'success.main',
          fontWeight: 500
        }}>
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
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          color: 'info.main',
          fontWeight: 500
        }}>
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

  useEffect(() => {
    const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
      keepalive: 60,
      clean: true,
      connectTimeout: 30 * 1000,
      reconnectPeriod: 1000
    });

    const topics = [
      'device/1/battery',
      'device/2/battery',
      'device/3/battery',
      'device/4/battery'
    ];

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnectionStatus('connected');
      topics.forEach(topic => client.subscribe(topic));
      setIsLoading(false);
    });

    client.on('message', (topic, message) => {
      const deviceId = topic.split('/')[1];
      const data = JSON.parse(message.toString());
      
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

    client.on('error', () => {
      setConnectionStatus('error');
    });

    return () => {
      client.end();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const LoadingOverlay = () => (
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
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      zIndex: 2,
      gap: 2
    }}>
      <CircularProgress size={40} />
      <Typography variant="h6" color="primary">
        Loading Device Data...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Connecting to MQTT broker
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ 
      width: '100%',
      p: 3,
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ mb: 3 }}>
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

        {connectionStatus === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Connection error. Please refresh the page.
          </Alert>
        )}

        <Box sx={{ 
          height: 400, 
          width: '100%',
          position: 'relative',
          '& .MuiDataGrid-root': {
            border: 'none',
            backgroundColor: 'white',
            borderRadius: 1,
            '& .MuiDataGrid-cell': {
              borderColor: 'rgba(224, 224, 224, 0.5)'
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'primary.light',
              color: 'white',
              fontWeight: 'bold'
            }
          }
        }}>
          {isLoading && <LoadingOverlay />}
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