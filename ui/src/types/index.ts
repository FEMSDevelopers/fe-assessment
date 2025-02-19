export interface DeviceData {
  id: string;
  name: string;
  time?: number;
  temp?: number;
  prevTemp?: number;
  hum?: number;
  prevHum?: number;
  lastUpdated?: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'error';

export interface MQTTMessage {
  time: number;
  temp: number;
  hum: number;
}

export const MQTT_CONFIG = {
  url: 'wss://broker.emqx.io:8084/mqtt',
  options: {
    keepalive: 60,
    clean: true,
    connectTimeout: 30 * 1000,
    reconnectPeriod: 1000,
  }
} as const;

export const DEVICE_TOPICS = [
  'device/1/battery',
  'device/2/battery',
  'device/3/battery',
  'device/4/battery',
] as const; 