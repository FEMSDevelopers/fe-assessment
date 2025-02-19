import { useEffect, useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  TextField, 
  Button,
  CircularProgress,
  Alert,
  Box,
  Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
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
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [newValues, setNewValues] = useState({ temp: '', hum: '' });
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Name', width: 130 },
    { 
      field: 'time', 
      headerName: 'Time', 
      width: 180,
      valueGetter: (params) => {
        try {
          return params.row?.time ? new Date(params.row.time).toLocaleString() : 'No data';
        } catch (e) {
          return 'No data';
        }
      }
    },
    { 
      field: 'temp', 
      headerName: 'Temperature', 
      width: 130,
      valueGetter: (params) => {
        try {
          return params.row?.temp !== undefined ? `${params.row.temp}°C` : 'Loading...';
        } catch (e) {
          return 'Loading...';
        }
      }
    },
    { 
      field: 'hum', 
      headerName: 'Humidity', 
      width: 130,
      valueGetter: (params) => {
        try {
          return params.row?.hum !== undefined ? `${params.row.hum}%` : 'Loading...';
        } catch (e) {
          return 'Loading...';
        }
      }
    },
    {
      field: 'lastUpdated',
      headerName: 'Last Update',
      width: 130,
      renderCell: (params) => {
        const timeDiff = Date.now() - (params.row.lastUpdated || 0);
        const seconds = Math.floor(timeDiff / 1000);
        return <Chip 
          label={`${seconds}s ago`} 
          color={seconds > 10 ? "warning" : "success"}
          size="small"
        />;
      }
    },
    {
      field: 'actions',
      headerName: 'Publish',
      width: 130,
      renderCell: (params) => (
        <IconButton
          onClick={() => {
            setSelectedDevice(params.row.id);
            setOpenDialog(true);
          }}
        >
          <EditIcon />
        </IconButton>
      ),
    }
  ];

  useEffect(() => {
    let client: mqtt.MqttClient | null = null;
    let mounted = true;

    const connect = async () => {
      try {
        client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
          keepalive: 60,
          clean: true,
          connectTimeout: 30 * 1000,
          reconnectPeriod: 1000,
          rejectUnauthorized: false
        });

        const topics = [
          'device/1/battery',
          'device/2/battery',
          'device/3/battery',
          'device/4/battery'
        ];

        // Initialize empty devices
        topics.forEach(topic => {
          const deviceId = topic.split('/')[1];
          setDevices(prev => ({
            ...prev,
            [deviceId]: {
              id: deviceId,
              name: `Device ${deviceId}`,
              time: undefined,
              temp: undefined,
              hum: undefined,
              lastUpdated: Date.now()
            }
          }));
        });

        client.on('connect', () => {
          if (!mounted) return;
          console.log('Connected to MQTT broker');
          setConnectionStatus('connected');
          setError(null);
          
          topics.forEach(topic => {
            client?.subscribe(topic, (err) => {
              if (err) console.error('Subscribe error:', err);
            });
          });
          
          setIsLoading(false);
        });

        client.on('message', (topic, message) => {
          if (!mounted) return;
          try {
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
          } catch (error) {
            console.error('Error processing message:', error);
          }
        });

        client.on('error', (err) => {
          if (!mounted) return;
          console.error('MQTT Error:', err);
          setConnectionStatus('error');
        });

        client.on('close', () => {
          if (!mounted) return;
          setConnectionStatus('disconnected');
        });
      } catch (err) {
        console.error('Connection error:', err);
        setConnectionStatus('error');
      }
    };

    connect();

    return () => {
      mounted = false;
      if (client) {
        client.end(true);
      }
    };
  }, []);

  const handlePublish = async () => {
    if (!selectedDevice) return;

    const data = {
      time: Date.now(),
      temp: parseFloat(newValues.temp),
      hum: parseFloat(newValues.hum)
    };

    try {
      const response = await fetch(`http://localhost:3000/api/publish/${selectedDevice}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setOpenDialog(false);
        setNewValues({ temp: '', hum: '' });
      }
    } catch (error) {
      console.error('Failed to publish:', error);
    }
  };

  const rows = Object.values(devices);

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Chip
          label={`Status: ${connectionStatus}`}
          color={
            connectionStatus === 'connected' ? 'success' :
            connectionStatus === 'connecting' ? 'warning' :
            'error'
          }
          sx={{ mb: 1 }}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </Box>

      <div style={{ height: 400, width: '100%', position: 'relative' }}>
        {isLoading ? (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1
          }}>
            <CircularProgress />
          </Box>
        ) : null}
        
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 5 }
            },
          }}
          pageSizeOptions={[5]}
        />
      </div>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Publish New Values</DialogTitle>
        <DialogContent>
          <TextField
            label="Temperature"
            type="number"
            value={newValues.temp}
            onChange={(e) => setNewValues(prev => ({ ...prev, temp: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Humidity"
            type="number"
            value={newValues.hum}
            onChange={(e) => setNewValues(prev => ({ ...prev, hum: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <Button onClick={handlePublish} variant="contained" sx={{ mt: 2 }}>
            Publish
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeviceTable; 