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
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const handleMessage = useCallback((topic: string, message: Buffer) => {
    if (isPaused) return;

    try {
      const deviceId = topic.split('/')[1];
      const data = JSON.parse(message.toString()) as MQTTMessage;
      
      // Collect updates
      pendingUpdatesRef.current[deviceId] = {
        id: deviceId,
        name: `Device ${deviceId}`,
        temp: data.temp,
        hum: data.hum,
        time: Date.now(),
      };

      const currentTime = Date.now();
      // Only update if not paused and enough time has passed
      if (!isPaused && currentTime - lastUpdateTimeRef.current >= 2000) {
        setDevices(prev => {
          const updates = Object.entries(pendingUpdatesRef.current).reduce((acc, [id, device]) => ({
            ...acc,
            [id]: {
              ...device,
              prevTemp: prev[id]?.temp || 0,
              prevHum: prev[id]?.hum || 0,
            }
          }), {});

          return { ...prev, ...updates };
        });
        
        setLastUpdate(currentTime);
        lastUpdateTimeRef.current = currentTime;
        pendingUpdatesRef.current = {};
      }

    } catch (error) {
      console.error('Error handling MQTT message:', error);
    }
  }, [isPaused]);

  // Add heartbeat check
  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/health');
      if (!response.ok) {
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Backend connection lost:', error);
      setConnectionStatus('error');
    }
  }, []);

  // Start heartbeat when component mounts
  useEffect(() => {
    // Check connection immediately
    checkConnection();

    // Set up periodic checks
    heartbeatRef.current = setInterval(checkConnection, 5000);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [checkConnection]);

  // Update MQTT connection effect
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
      if (!isPaused) {  // Only process messages if not paused
        console.log('Message received on topic:', topic);
        handleMessage(topic, message);
      }
    });

    client.on('error', (err) => {
      console.error('MQTT client error:', err);
      setConnectionStatus('error');
    });

    client.on('close', () => {
      console.log('MQTT connection closed');
      setConnectionStatus('error');
    });

    // Cleanup only when component unmounts
    return () => {
      console.log('Cleaning up MQTT connection');
      if (clientRef.current) {
        clientRef.current.end(true);
        clientRef.current = null;
      }
    };
  }, [isPaused]); // Add isPaused to dependencies

  const togglePause = useCallback(async (shouldPause: boolean) => {
    try {
      const response = await fetch('http://localhost:3000/api/publish/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !shouldPause })
      });

      if (response.ok) {
        setIsPaused(shouldPause);
        // Clear any pending updates
        pendingUpdatesRef.current = {};
        // Update last update time to prevent immediate update after unpause
        lastUpdateTimeRef.current = Date.now();
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