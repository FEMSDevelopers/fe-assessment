// Create a controller for handling MQTT-related requests
import { Request, Response } from 'express';
import { MQTTService } from '../services/mqtt.service';
import { DeviceData } from '../types';

export class MQTTController {
  constructor(private mqttService: MQTTService) {}

  public handlePublishControl(req: Request, res: Response): void {
    const { enabled } = req.body;
    
    if (enabled) {
      this.mqttService.startPublishing();
    } else {
      this.mqttService.stopPublishing();
    }
    
    res.json({ 
      success: true, 
      publishing: enabled 
    });
  }

  public async handleDevicePublish(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const data: DeviceData = {
        time: Date.now(),
        temp: req.body.temp,
        hum: req.body.hum
      };

      await this.mqttService.publish(`device/${deviceId}/battery`, data);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to publish:', error);
      res.status(500).json({ error: 'Failed to publish' });
    }
  }
} 