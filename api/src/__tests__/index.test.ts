import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mqtt from 'mqtt';
import { createServer } from '../index';

// Create a single mock MQTT client that we'll reuse
const mockMqttClient = {
  on: vi.fn(),
  publish: vi.fn((topic, message, callback) => callback()),
  end: vi.fn(),
};

// Mock MQTT with consistent implementation
vi.mock('mqtt', () => ({
  default: {
    connect: vi.fn(() => mockMqttClient)
  }
}));

describe('MQTT API Server', () => {
  let app: express.Application;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    // Create new server instance
    app = createServer();
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
      // Temporarily override publish implementation for this test
      mockMqttClient.publish.mockImplementationOnce((topic, message, callback) => {
        callback(new Error('Publish failed'));
      });

      const response = await request(app)
        .post(`/api/publish/1`)
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
      expect(mqtt.connect).toHaveBeenCalledWith(
        'wss://broker.emqx.io:8084/mqtt',
        {
          clean: true,
          connectTimeout: 30000,
          keepalive: 60,
          reconnectPeriod: 1000
        }
      );
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