import { useState, useEffect, useCallback } from 'react';
import mqtt from 'mqtt';
import { DeviceData, ConnectionStatus, MQTT_CONFIG, DEVICE_TOPICS, MQTTMessage } from '../types';

export const useMQTTConnection = () => {
  const [devices, setDevices] = useState<Record<string, DeviceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [hasInitialData, setHasInitialData] = useState(false);

  const handleMessage = useCallback((topic: string, message: Buffer) => {
    const deviceId = topic.split('/')[1];
    const data = JSON.parse(message.toString()) as MQTTMessage;
    
    setDevices(prev => {
      const newDevices = {
        ...prev,
        [deviceId]: {
          id: deviceId,
          name: `Device ${deviceId}`,
          ...data,
          lastUpdated: Date.now()
        }
      };

      // Check if we have data for all devices
      const hasAllDevices = DEVICE_TOPICS.every(topic => {
        const id = topic.split('/')[1];
        return newDevices[id]?.temp !== undefined;
      });

      if (hasAllDevices && !hasInitialData) {
        setHasInitialData(true);
        setTimeout(() => setIsLoading(false), 500); // Smooth transition
      }

      return newDevices;
    });
    setLastUpdate(Date.now());
  }, [hasInitialData]);

  useEffect(() => {
    const client = mqtt.connect(MQTT_CONFIG.url, MQTT_CONFIG.options);
    let initialDataTimeout: NodeJS.Timeout;

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnectionStatus('connected');
      DEVICE_TOPICS.forEach(topic => client.subscribe(topic));
      
      // Set a maximum wait time for initial data
      initialDataTimeout = setTimeout(() => {
        if (!hasInitialData) {
          setHasInitialData(true);
          setIsLoading(false);
        }
      }, 5000);
    });

    client.on('message', handleMessage);
    client.on('error', () => {
      setConnectionStatus('error');
      setIsLoading(false);
    });

    return () => {
      clearTimeout(initialDataTimeout);
      client.end();
    };
  }, [handleMessage, hasInitialData]);

  // Only show data when we have initial data and aren't loading
  const showData = !isLoading && hasInitialData;

  return {
    devices: showData ? devices : {},
    isLoading: isLoading || !hasInitialData,
    connectionStatus: isLoading ? 'connecting' : connectionStatus,
    lastUpdate
  };
}; 