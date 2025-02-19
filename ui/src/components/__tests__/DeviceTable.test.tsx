import { render, screen, act, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, afterEach } from 'vitest';
import DeviceTable from '../DeviceTable';

// Create a proper MQTT mock
const mockSubscribe = vi.fn();
const mockEnd = vi.fn();
const mockClient = {
  on: vi.fn((event: string, callback: any) => {
    if (event === 'connect') {
      setTimeout(() => callback(), 100);
    }
    return mockClient;
  }),
  subscribe: mockSubscribe,
  end: mockEnd,
};

// Mock the MQTT module
vi.mock('mqtt', () => ({
  default: {
    connect: () => mockClient
  }
}));

describe('DeviceTable', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockSubscribe.mockClear();
    mockEnd.mockClear();
    mockClient.on.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loading state initially', () => {
    render(<DeviceTable />);
    expect(screen.getByText('Loading Device Data...')).toBeInTheDocument();
    expect(screen.getByText('Connecting to MQTT broker')).toBeInTheDocument();
  });

  it('shows connection status', async () => {
    render(<DeviceTable />);
    expect(screen.getByText('Status: connecting')).toBeInTheDocument();
    
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    
    expect(screen.getByText('Status: connected')).toBeInTheDocument();
  });

  it('updates last update time', async () => {
    render(<DeviceTable />);
    
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const messageCallback = mockClient.on.mock.calls.find(call => call[0] === 'message')?.[1];
    if (messageCallback) {
      act(() => {
        messageCallback('device/1/battery', JSON.stringify({
          time: Date.now(),
          temp: 25.5,
          hum: 60
        }));
      });
    }

    await waitFor(() => {
      const chipLabel = screen.getByText(/Last update: \ds ago/);
      expect(chipLabel).toBeInTheDocument();
    });
  });

  it('shows correct column headers', async () => {
    render(<DeviceTable />);
    
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Device Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Last Update Time' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Temperature' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Humidity' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
  });

  it('handles MQTT messages correctly', async () => {
    render(<DeviceTable />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const messageCallback = mockClient.on.mock.calls.find(call => call[0] === 'message')?.[1];
    if (messageCallback) {
      act(() => {
        messageCallback('device/1/battery', JSON.stringify({
          time: Date.now(),
          temp: 25.5,
          hum: 60
        }));
      });

      await waitFor(() => {
        const tempCell = screen.getByTestId('temp-cell-1');
        const humCell = screen.getByTestId('hum-cell-1');
        
        expect(tempCell).toHaveTextContent('25.5°C');
        expect(humCell).toHaveTextContent('60.0%');
      }, {
        timeout: 2000,
        interval: 100
      });
    }
  });
}); 