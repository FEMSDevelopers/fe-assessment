import { useEffect, useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, CircularProgress, Chip } from '@mui/material';
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
      renderCell: (params) => `${params.row.temp?.toFixed(1)}°C`
    },
    { 
      field: 'hum', 
      headerName: 'Humidity', 
      width: 130,
      renderCell: (params) => `${params.row.hum?.toFixed(1)}%`
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
          ...data
        }
      }));
    });

    return () => {
      client.end();
    };
  }, []);

  return (
    <Box sx={{ height: 400, width: '100%' }}>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataGrid
          rows={Object.values(devices)}
          columns={columns}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          autoHeight
        />
      )}
    </Box>
  );
};

export default DeviceTable; 