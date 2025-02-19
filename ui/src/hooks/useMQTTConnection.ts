import { useState, useEffect, useCallback } from 'react';
import mqtt from 'mqtt';
import { DeviceData, ConnectionStatus, MQTT_CONFIG, DEVICE_TOPICS, MQTTMessage } from '../types';

export const useMQTTConnection = () => {
  const [devices, setDevices] = useState<Record<string, DeviceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const handleMessage = useCallback((topic: string, message: Buffer) => {
    const deviceId = topic.split('/')[1];
    const data = JSON.parse(message.toString()) as MQTTMessage;
    
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
  }, []);

  useEffect(() => {
    const client = mqtt.connect(MQTT_CONFIG.url, MQTT_CONFIG.options);

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnectionStatus('connected');
      DEVICE_TOPICS.forEach(topic => client.subscribe(topic));
      setIsLoading(false);
    });

    client.on('message', handleMessage);
    client.on('error', () => setConnectionStatus('error'));

    return () => {
      client.end();
    };
  }, [handleMessage]);

  return {
    devices,
    isLoading,
    connectionStatus,
    lastUpdate
  };
}; 