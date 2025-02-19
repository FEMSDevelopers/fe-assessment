import { vi } from 'vitest';

export const mockMqttClient = {
  on: vi.fn(),
  publish: vi.fn((topic, message, callback) => callback()),
  end: vi.fn(),
};

vi.mock('mqtt', () => ({
  default: {
    connect: vi.fn(() => mockMqttClient)
  }
})); 