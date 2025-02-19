import { vi, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from '../index';

// Simple mock that just needs to exist
vi.mock('mqtt', () => ({
  default: {
    connect: () => ({
      on: vi.fn(),
      publish: vi.fn((topic, message, callback) => callback()),
      end: vi.fn()
    })
  }
}));

describe('API Server', () => {
  const app = createServer();

  it('handles publish control', async () => {
    const response = await request(app)
      .post('/api/publish/control')
      .send({ enabled: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      publishing: true
    });
  });

  it('handles device publish', async () => {
    // We don't care about the actual values since they're random
    const response = await request(app)
      .post('/api/publish/1')
      .send({
        temp: 25,  // Any number will do
        hum: 60    // Any number will do
      });

    // We only care that the API responds correctly
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  }, { timeout: 1000 }); // Add shorter timeout
}); 