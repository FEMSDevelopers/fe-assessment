// Create a service for MQTT functionality
import mqtt, { MqttClient } from 'mqtt';
import { DeviceData, MQTT_CONFIG, DEVICE_TOPICS } from '../types';

export class MQTTService {
  private client: MqttClient;
  private isPublishing: boolean = true;
  private publishInterval: NodeJS.Timer | null = null;

  constructor() {
    this.client = mqtt.connect(MQTT_CONFIG.url, MQTT_CONFIG.options);
    this.setupPublishing();
  }

  private generateDeviceData(): DeviceData {
    return {
      time: Date.now(),
      temp: parseFloat((Math.random() * 40).toFixed(2)),
      hum: parseFloat((Math.random() * 50 + 30).toFixed(2))
    };
  }

  private setupPublishing(): void {
    this.client.on('connect', () => {
      console.log('Connected to MQTT broker');
      this.startPublishing();
    });
  }

  private startPublishing(): void {
    if (this.publishInterval) {
      clearInterval(this.publishInterval);
    }

    this.publishInterval = setInterval(() => {
      if (this.isPublishing) {
        DEVICE_TOPICS.forEach(topic => {
          const data = this.generateDeviceData();
          this.publishToTopic(topic, data);
        });
      }
    }, 5000);
  }

  public async publishToTopic(topic: string, data: DeviceData): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.publish(topic, JSON.stringify(data), (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  public setPublishing(enabled: boolean): boolean {
    this.isPublishing = enabled;
    return this.isPublishing;
  }

  public cleanup(): void {
    if (this.publishInterval) {
      clearInterval(this.publishInterval);
    }
    this.client.end();
  }
} 