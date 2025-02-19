import { DeviceData } from '../api/src/types';

export function generateRandomData(): DeviceData {
  return {
    temp: 20 + Math.random() * 15, // Random temp between 20-35
    hum: 30 + Math.random() * 50,  // Random humidity between 30-80
    time: Date.now()
  };
} 