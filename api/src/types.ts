export interface DeviceData {
  time: number;
  temp: number;
  hum: number;
}

export interface ErrorResponse {
  error: string;
}

export const MQTT_CONFIG = {
  url: 'wss://broker.emqx.io:8084/mqtt',
  options: {
    clean: true,
    connectTimeout: 30000,
    keepalive: 60,
    reconnectPeriod: 1000
  }
};

export const DEVICE_TOPICS = [
  'device/1/battery',
  'device/2/battery',
  'device/3/battery',
  'device/4/battery'
]; 