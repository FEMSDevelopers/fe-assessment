import { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { IconButton, Dialog, DialogTitle, DialogContent, TextField, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import mqtt from 'mqtt';

interface DeviceData {
  id: string;
  name: string;
  time?: number;
  temp?: number;
  hum?: number;
}

const DeviceTable = () => {
  const [devices, setDevices] = useState<Record<string, DeviceData>>({});
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [newValues, setNewValues] = useState({ temp: '', hum: '' });
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  useEffect(() => {
    console.log('Connecting to MQTT broker...');
    const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt');

    const topics = [
      'device/1/battery',
      'device/2/battery',
      'device/3/battery',
      'device/4/battery'
    ];

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnectionStatus('Connected');
      
      // Subscribe to all topics
      topics.forEach(topic => {
        client.subscribe(topic, (err) => {
          if (!err) {
            console.log(`Subscribed to ${topic}`);
          } else {
            console.error(`Failed to subscribe to ${topic}:`, err);
          }
        });
      });
    });

    client.on('message', (topic, message) => {
      console.log(`Received message on ${topic}:`, message.toString());
      try {
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
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    client.on('error', (err) => {
      console.error('MQTT Error:', err);
      setConnectionStatus('Error connecting');
    });

    return () => {
      console.log('Cleaning up MQTT connection');
      client.end();
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

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Name', width: 130 },
    { field: 'time', headerName: 'Time', width: 130 },
    { field: 'temp', headerName: 'Temperature', width: 130 },
    { field: 'hum', headerName: 'Humidity', width: 130 },
    {
      field: 'actions',
      headerName: 'Publish',
      width: 130,
      renderCell: (params: any) => (
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

  const rows = Object.values(devices);

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        Connection Status: {connectionStatus}
      </div>
      <div style={{ height: 400, width: '100%' }}>
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