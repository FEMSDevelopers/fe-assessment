import { useEffect, useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, CircularProgress, Chip, Alert } from '@mui/material';
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

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Name', width: 130 },
    { 
      field: 'time', 
      headerName: 'Time', 
      width: 180,
      renderCell: (params) => new Date(params.row.time || 0).toLocaleString()
    },
    { 
      field: 'temp', 
      headerName: 'Temperature', 
      width: 130,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
      width: 130,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Chip
          label={`Status: ${connectionStatus}`}
          color={
            connectionStatus === 'connected' ? 'success' :
            connectionStatus === 'connecting' ? 'warning' : 'error'
          }
        />
        {connectionStatus === 'connected' && (
          <Chip
            label={`Last update: ${((Date.now() - lastUpdate) / 1000).toFixed(1)}s ago`}
            color="info"
          />
        )}
      </Box>

      {connectionStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Connection error. Please refresh the page.
        </Alert>
      )}

      <Box sx={{ height: 400, width: '100%' }}>
        {isLoading ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            flexDirection: 'column',
            gap: 2
          }}>
            <CircularProgress />
            <Chip label="Connecting to MQTT broker..." />
          </Box>
        ) : (
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
                '0%': {
                  opacity: 0.5,
                },
                '100%': {
                  opacity: 1,
                }
              }
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default DeviceTable; 