import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DriverState from '../driver-state';
import type { Driver } from '@/types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createMockDriver = (overrides: Partial<Driver> = {}): Driver => ({
  id: '44:1D:64:F8:9A:58',
  state: 'connected',
  lastSeen: Date.now(),
  failedHeartbeats: 0,
  ip: '192.168.1.50',
  disabled: false,
  stats: {
    telemetryEventsReceived: 0,
    mqttMessagesReceived: 0,
    mqttMessagesFailed: 0,
    udpMessagesSent: 0,
    udpMessagesFailed: 0,
  },
  ...overrides,
});

const renderWithRouter = (component: React.ReactNode) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('DriverState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('connection state chip', () => {
    it('shows Connected chip when driver is connected', () => {
      const driver = createMockDriver({ state: 'connected' });
      renderWithRouter(<DriverState driver={driver} />);

      expect(screen.getByText('Connected')).toBeDefined();
      expect(screen.queryByText('Disconnected')).toBeNull();
    });

    it('shows Disconnected chip when driver is not connected', () => {
      const driver = createMockDriver({ state: 'disconnected' });
      renderWithRouter(<DriverState driver={driver} />);

      expect(screen.getByText('Disconnected')).toBeDefined();
      expect(screen.queryByText('Connected')).toBeNull();
    });

    it('shows Updating chip when driver is updating firmware', () => {
      const driver = createMockDriver({ state: 'updating' });
      renderWithRouter(<DriverState driver={driver} />);

      expect(screen.getByText('Updating')).toBeDefined();
      expect(screen.queryByText('Connected')).toBeNull();
      expect(screen.queryByText('Disconnected')).toBeNull();
    });
  });

  describe('disabled state', () => {
    it('shows Disabled chip when driver is disabled', () => {
      const driver = createMockDriver({ disabled: true, state: 'connected' });
      renderWithRouter(<DriverState driver={driver} />);

      expect(screen.getByText('Disabled')).toBeDefined();
      expect(screen.queryByText('Connected')).toBeNull();
    });

    it('shows Disabled chip instead of Disconnected when disabled', () => {
      const driver = createMockDriver({ disabled: true, state: 'disconnected' });
      renderWithRouter(<DriverState driver={driver} />);

      expect(screen.getByText('Disabled')).toBeDefined();
      expect(screen.queryByText('Disconnected')).toBeNull();
    });

    it('does not show update warning when driver is disabled', () => {
      const driver = createMockDriver({
        disabled: true,
        state: 'connected',
        telemetry: { firmwareVersion: '1.0.0' } as Driver['telemetry'],
      });
      renderWithRouter(<DriverState driver={driver} currentFirmwareVersion="2.0.0" />);

      expect(screen.getByText('Disabled')).toBeDefined();
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('update warning indicator', () => {
    it('shows warning icon when driver needs update', () => {
      const driver = createMockDriver({
        state: 'connected',
        telemetry: { firmwareVersion: '1.0.0' } as Driver['telemetry'],
      });
      renderWithRouter(<DriverState driver={driver} currentFirmwareVersion="2.0.0" />);

      // Warning icon should be present (MUI Warning icon has data-testid)
      const warningButton = screen.getByRole('button');
      expect(warningButton).toBeDefined();
    });

    it('does not show warning icon when firmware versions match', () => {
      const driver = createMockDriver({
        state: 'connected',
        telemetry: { firmwareVersion: '1.0.0' } as Driver['telemetry'],
      });
      renderWithRouter(<DriverState driver={driver} currentFirmwareVersion="1.0.0" />);

      expect(screen.queryByRole('button')).toBeNull();
    });

    it('does not show warning icon when driver is disconnected', () => {
      const driver = createMockDriver({
        state: 'disconnected',
        telemetry: { firmwareVersion: '1.0.0' } as Driver['telemetry'],
      });
      renderWithRouter(<DriverState driver={driver} currentFirmwareVersion="2.0.0" />);

      expect(screen.queryByRole('button')).toBeNull();
    });

    it('does not show warning icon when no currentFirmwareVersion provided', () => {
      const driver = createMockDriver({ state: 'connected' });
      renderWithRouter(<DriverState driver={driver} />);

      expect(screen.queryByRole('button')).toBeNull();
    });

    it('does not show warning icon when driver has no telemetry', () => {
      const driver = createMockDriver({
        state: 'connected',
        telemetry: undefined,
      });
      renderWithRouter(<DriverState driver={driver} currentFirmwareVersion="2.0.0" />);

      expect(screen.queryByRole('button')).toBeNull();
    });

    it('navigates to firmware page when warning icon is clicked', () => {
      const driver = createMockDriver({
        state: 'connected',
        telemetry: { firmwareVersion: '1.0.0' } as Driver['telemetry'],
      });
      renderWithRouter(<DriverState driver={driver} currentFirmwareVersion="2.0.0" />);

      const warningButton = screen.getByRole('button');
      fireEvent.click(warningButton);

      expect(mockNavigate).toHaveBeenCalledWith('/firmware');
    });

    it('stops event propagation when warning icon is clicked', () => {
      const driver = createMockDriver({
        state: 'connected',
        telemetry: { firmwareVersion: '1.0.0' } as Driver['telemetry'],
      });

      const handleParentClick = vi.fn();
      const { container } = render(
        <MemoryRouter>
          <div onClick={handleParentClick}>
            <DriverState driver={driver} currentFirmwareVersion="2.0.0" />
          </div>
        </MemoryRouter>,
      );

      // Get the button within this specific render
      const warningButton = container.querySelector('button');
      expect(warningButton).not.toBeNull();
      fireEvent.click(warningButton!);

      expect(handleParentClick).not.toHaveBeenCalled();
    });
  });
});
