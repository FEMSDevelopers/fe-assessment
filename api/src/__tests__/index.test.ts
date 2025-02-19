import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mqtt from 'mqtt';
import { createServer } from '../index';

// Mock MQTT
vi.mock('mqtt', () => ({
  default: {
    connect: vi.fn(() => ({
      on: vi.fn(),
      publish: vi.fn(),
      end: vi.fn(),
    })),
  },
}));

describe('MQTT API Server', () => {
  let app: express.Application;
  let mockMqttClient: any;

  beforeEach(() => {
    mockMqttClient = {
      on: vi.fn(),
      publish: vi.fn((topic, message, callback) => callback()),
      end: vi.fn(),
    };
    (mqtt.connect as any).mockReturnValue(mockMqttClient);
    app = createServer();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/publish/control', () => {
    it('enables publishing', async () => {
      const response = await request(app)
        .post('/api/publish/control')
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        publishing: true,
      });
    });

    it('disables publishing', async () => {
      const response = await request(app)
        .post('/api/publish/control')
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        publishing: false,
      });
    });
  });

  describe('POST /api/publish/:deviceId', () => {
    it('publishes data to correct topic', async () => {
      const deviceId = '1';
      const testData = {
        time: Date.now(),
        temp: 25.5,
        hum: 60,
      };

      const response = await request(app)
        .post(`/api/publish/${deviceId}`)
        .send(testData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        `device/${deviceId}/battery`,
        JSON.stringify(testData),
        expect.any(Function)
      );
    });

    it('handles publish error', async () => {
      const deviceId = '1';
      mockMqttClient.publish.mockImplementationOnce((topic, message, callback) => {
        callback(new Error('Publish failed'));
      });

      const response = await request(app)
        .post(`/api/publish/${deviceId}`)
        .send({
          time: Date.now(),
          temp: 25.5,
          hum: 60,
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to publish' });
    });
  });

  describe('MQTT Connection', () => {
    it('connects to broker with correct options', () => {
      expect(mqtt.connect).toHaveBeenCalledWith('wss://broker.emqx.io:8084/mqtt');
    });

    it('sets up automatic publishing on connect', () => {
      const connectCallback = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      
      expect(connectCallback).toBeDefined();
      
      if (connectCallback) {
        vi.useFakeTimers();
        connectCallback();
        
        vi.advanceTimersByTime(5000);
        
        expect(mockMqttClient.publish).toHaveBeenCalled();
        const publishCall = mockMqttClient.publish.mock.calls[0];
        expect(publishCall[0]).toMatch(/device\/\d+\/battery/);
        const publishedData = JSON.parse(publishCall[1]);
        expect(publishedData).toMatchObject({
          time: expect.any(Number),
          temp: expect.any(Number),
          hum: expect.any(Number),
        });
        
        vi.useRealTimers();
      }
    });
  });
}); 