import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { describe, it, expect } from 'vitest';
import DeviceTable from '../DeviceTable';
import { useMQTTConnection } from '../../hooks/useMQTTConnection';

// Mock the hook
vi.mock('../../hooks/useMQTTConnection');

describe('DeviceTable', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders basic device information', () => {
    // Mock with any data, values don't matter
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

    // Just verify that basic device info is shown
    expect(screen.getByText('Device 1')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
}); 