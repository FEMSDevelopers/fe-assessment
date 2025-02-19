import { useState, useEffect, useCallback } from 'react';
import mqtt from 'mqtt';
import { DeviceData, ConnectionStatus, MQTT_CONFIG, DEVICE_TOPICS, MQTTMessage } from '../types';

export const useMQTTConnection = () => {
  const [devices, setDevices] = useState<Record<string, DeviceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [hasInitialData, setHasInitialData] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const handleMessage = useCallback((topic: string, message: Buffer) => {
    if (isPaused) return;

    const deviceId = topic.split('/')[1];
    const data = JSON.parse(message.toString()) as MQTTMessage;
    
    setDevices(prev => {
      const currentDevice = prev[deviceId];
      const newDevices = {
        ...prev,
        [deviceId]: {
          id: deviceId,
          name: `Device ${deviceId}`,
          prevTemp: currentDevice?.temp,
          prevHum: currentDevice?.hum,
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
        // Only stop loading when we have both connection and data
        if (isConnected) {
          setTimeout(() => setIsLoading(false), 1000);
        }
      }

      if (!isPaused) {
        setLastUpdate(Date.now());
      }

      return newDevices;
    });
  }, [isPaused, hasInitialData, isConnected]);

  const togglePause = useCallback(async (shouldPause: boolean) => {
    setIsPaused(shouldPause);
    
    try {
      await fetch('http://localhost:3000/api/publish/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !shouldPause })
      });
    } catch (error) {
      console.error('Failed to toggle publishing:', error);
    }
  }, []);

  useEffect(() => {
    const client = mqtt.connect(MQTT_CONFIG.url, MQTT_CONFIG.options);
    let initialDataTimeout: NodeJS.Timeout;

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnectionStatus('connected');
      setIsConnected(true);
      DEVICE_TOPICS.forEach(topic => client.subscribe(topic));
      
      // Set a maximum wait time for initial data
      initialDataTimeout = setTimeout(() => {
        if (!hasInitialData) {
          setHasInitialData(true);
          setIsLoading(false);
        }
      }, 7000); // Increased timeout for better UX
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

  // Only show data when we have both connection and initial data
  const showData = !isLoading && hasInitialData && isConnected;

  return {
    devices: showData ? devices : {},
    isLoading: isLoading || !hasInitialData || !isConnected,
    connectionStatus: isLoading ? 'connecting' : connectionStatus,
    lastUpdate,
    isPaused,
    togglePause
  };
}; 