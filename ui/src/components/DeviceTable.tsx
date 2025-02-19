import { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import mqtt from 'mqtt';

interface DeviceData {
  id: string;
  name: string;
  level?: number;
  voltage?: number;
  status?: string;
  health?: string;
  temperature?: number;
  cycles?: number;
  capacity?: number;
  runtime_remaining?: string;
  low_warning?: boolean;
}

const DeviceTable = () => {
  const [devices, setDevices] = useState<Record<string, DeviceData>>({});

  useEffect(() => {
    // Connect to MQTT broker
    const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt');

    const topics = [
      'device/1/battery',
      'device/2/battery',
      'device/3/battery',
      'device/4/battery'
    ];

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      topics.forEach(topic => client.subscribe(topic));
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

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Name', width: 130 },
    { field: 'level', headerName: 'Battery Level', width: 130 },
    { field: 'voltage', headerName: 'Voltage', width: 130 },
    { field: 'status', headerName: 'Status', width: 130 },
    { field: 'health', headerName: 'Health', width: 130 },
    { field: 'temperature', headerName: 'Temperature', width: 130 },
    { field: 'cycles', headerName: 'Cycles', width: 130 },
    { field: 'runtime_remaining', headerName: 'Runtime', width: 130 },
    { field: 'low_warning', headerName: 'Low Warning', width: 130 },
  ];

  const rows = Object.values(devices);

  return (
    <div style={{ height: 400, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={5}
        rowsPerPageOptions={[5]}
        disableSelectionOnClick
      />
    </div>
  );
};

export default DeviceTable; 