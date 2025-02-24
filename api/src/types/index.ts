// First, let's create a types file
export interface DeviceData {
  time: number;
  temp: number;
  hum: number;
}

export interface PublishControlRequest {
  enabled: boolean;
}

export interface PublishControlResponse {
  success: boolean;
  publishing: boolean;
}

export interface PublishResponse {
  success: boolean;
}

export interface ErrorResponse {
  error: string;
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

export type DeviceTopic = typeof DEVICE_TOPICS[number]; 