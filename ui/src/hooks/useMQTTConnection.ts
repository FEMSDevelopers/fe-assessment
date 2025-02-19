import { useState, useEffect, useCallback, useRef } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { DeviceData, ConnectionStatus, MQTT_CONFIG, DEVICE_TOPICS, MQTTMessage } from '../types';

export const useMQTTConnection = () => {
  const [devices, setDevices] = useState<Record<string, DeviceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [isPaused, setIsPaused] = useState(false);
  
  // Use ref to maintain client instance
  const clientRef = useRef<MqttClient | null>(null);
  const pendingUpdatesRef = useRef<Record<string, DeviceData>>({});
  const lastUpdateTimeRef = useRef<number>(0);

  const handleMessage = useCallback((topic: string, message: Buffer) => {
    if (isPaused) return;

    try {
      const deviceId = topic.split('/')[1];
      const data = JSON.parse(message.toString()) as MQTTMessage;
      const currentTime = Date.now();
      
      // Collect updates
      pendingUpdatesRef.current[deviceId] = {
        id: deviceId,
        name: `Device ${deviceId}`,
        prevTemp: devices[deviceId]?.temp,
        prevHum: devices[deviceId]?.hum,
        ...data,
        time: data.time || currentTime
      };

      // Only update if enough time has passed (1.9s to account for network delay)
      if (currentTime - lastUpdateTimeRef.current >= 1900) {
        setDevices(prev => ({
          ...prev,
          ...pendingUpdatesRef.current
        }));
        setLastUpdate(currentTime);
        lastUpdateTimeRef.current = currentTime;
        pendingUpdatesRef.current = {};
      }

    } catch (error) {
      console.error('Error handling MQTT message:', error);
    }
  }, [isPaused, devices]);

  useEffect(() => {
    if (clientRef.current) {
      return;
    }

    console.log('Connecting to MQTT broker...');
    const client = mqtt.connect(MQTT_CONFIG.url, {
      ...MQTT_CONFIG.options,
      clean: true,
      reconnectPeriod: 1000,
    });
    
    clientRef.current = client;

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnectionStatus('connected');
      
      // Subscribe to all device topics
      DEVICE_TOPICS.forEach(topic => {
        console.log('Subscribing to:', topic);
        client.subscribe(topic, (err) => {
          if (err) {
            console.error('Subscription error:', err);
          } else {
            console.log('Subscribed to:', topic);
          }
        });
      });
    });

    client.on('message', (topic, message) => {
      console.log('Message received on topic:', topic);
      handleMessage(topic, message);
    });

    client.on('error', (err) => {
      console.error('MQTT client error:', err);
      setConnectionStatus('error');
    });

    client.on('close', () => {
      console.log('MQTT connection closed');
    });

    // Cleanup only when component unmounts
    return () => {
      console.log('Cleaning up MQTT connection');
      if (clientRef.current) {
        clientRef.current.end(true);
        clientRef.current = null;
      }
    };
  }, []); // Empty dependency array

  const togglePause = useCallback(async (shouldPause: boolean) => {
    try {
      // Call the backend API to control publishing
      const response = await fetch('http://localhost:3000/api/publish/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !shouldPause })
      });

      if (response.ok) {
        setIsPaused(shouldPause);
      } else {
        console.error('Failed to toggle publishing state');
      }
    } catch (error) {
      console.error('Error toggling publish state:', error);
    }
  }, []);

  // Set loading to false after a short delay when connected
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus]);

  return {
    devices,
    isLoading,
    connectionStatus,
    lastUpdate,
    isPaused,
    togglePause
  };
}; 