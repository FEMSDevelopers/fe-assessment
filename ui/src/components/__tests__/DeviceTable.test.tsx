import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import DeviceTable from '../DeviceTable';

// Mock MQTT client
vi.mock('mqtt', () => ({
  default: {
    connect: () => ({
      on: (event: string, callback: any) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 100);
        }
        return {
          subscribe: vi.fn(),
          end: vi.fn(),
        };
      },
    }),
  },
}));

describe('DeviceTable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
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
    
    // Wait for connection
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    
    expect(screen.getByText('Status: connected')).toBeInTheDocument();
  });

  it('updates last update time', async () => {
    render(<DeviceTable />);
    
    // Wait for connection
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Advance timer by 5 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByText('Last update: 5s ago')).toBeInTheDocument();
  });

  it('shows correct column headers', async () => {
    render(<DeviceTable />);
    
    // Wait for connection
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Device Name')).toBeInTheDocument();
    expect(screen.getByText('Last Update Time')).toBeInTheDocument();
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('Humidity')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });
}); 