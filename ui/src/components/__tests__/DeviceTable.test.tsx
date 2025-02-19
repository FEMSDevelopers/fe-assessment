import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import DeviceTable from '../DeviceTable';
import { useMQTTConnection } from '../../hooks/useMQTTConnection';

// Mock the hook
vi.mock('../../hooks/useMQTTConnection');

describe('DeviceTable', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows loading state initially', () => {
    vi.mocked(useMQTTConnection).mockReturnValue({
      devices: {},
      isLoading: true,
      connectionStatus: 'connecting',
      lastUpdate: null,
      isPaused: false,
      togglePause: vi.fn()
    });

    render(<DeviceTable />);
    expect(screen.getByText('Initializing IoT Dashboard')).toBeInTheDocument();
  });

  it('renders device information when data is available', () => {
    vi.mocked(useMQTTConnection).mockReturnValue({
      devices: {
        '1': {
          id: '1',
          name: 'Device 1',
          temp: 25,
          hum: 60,
          time: Date.now()
        }
      },
      isLoading: false,
      connectionStatus: 'connected',
      lastUpdate: Date.now(),
      isPaused: false,
      togglePause: vi.fn()
    });

    render(<DeviceTable />);

    // Check for stable elements we know exist
    expect(screen.getByText('Device 1')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    
    // Check column headers by their exact text
    expect(screen.getByRole('columnheader', { name: 'Temperature (°C)' })).toBeInTheDocument();
  });

  it('handles empty device list', () => {
    vi.mocked(useMQTTConnection).mockReturnValue({
      devices: {},
      isLoading: false,
      connectionStatus: 'connected',
      lastUpdate: Date.now(),
      isPaused: false,
      togglePause: vi.fn()
    });

    render(<DeviceTable />);
    // Just verify the grid exists
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });
}); 