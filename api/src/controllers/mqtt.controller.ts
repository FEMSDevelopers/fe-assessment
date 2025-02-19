// Create a controller for handling MQTT-related requests
import { Request, Response } from 'express';
import { MQTTService } from '../services/mqtt.service';
import { PublishControlRequest, DeviceData, PublishControlResponse, PublishResponse, ErrorResponse } from '../types';

export class MQTTController {
  private mqttService: MQTTService;

  constructor(mqttService: MQTTService) {
    this.mqttService = mqttService;
  }

  public async handlePublishControl(
    req: Request<{}, {}, PublishControlRequest>, 
    res: Response<PublishControlResponse | ErrorResponse>
  ): Promise<void> {
    try {
      const { enabled } = req.body;
      const publishing = this.mqttService.setPublishing(enabled);
      res.json({ success: true, publishing });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update publishing state' });
    }
  }

  public async handleDevicePublish(
    req: Request<{ deviceId: string }, {}, DeviceData>,
    res: Response<PublishResponse | ErrorResponse>
  ): Promise<void> {
    try {
      const { deviceId } = req.params;
      const data = req.body;
      
      await this.mqttService.publishToTopic(`device/${deviceId}/battery`, data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to publish' });
    }
  }
} 