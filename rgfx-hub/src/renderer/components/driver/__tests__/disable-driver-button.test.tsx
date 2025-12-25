import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DisableDriverButton from '../disable-driver-button';
import type { Driver } from '@/types';

const mockSetDriverDisabled = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Cast to unknown first to allow partial mock
  (window as unknown as { rgfx: { setDriverDisabled: typeof mockSetDriverDisabled } }).rgfx = {
    setDriverDisabled: mockSetDriverDisabled,
  };
});

afterEach(() => {
  cleanup();
});

const createMockDriver = (overrides: Partial<Driver> = {}): Driver => ({
  id: 'rgfx-driver-0001',
  state: 'connected',
  lastSeen: Date.now(),
  failedHeartbeats: 0,
  ip: '192.168.1.50',
  disabled: false,
  stats: {
    telemetryEventsReceived: 0,
    mqttMessagesReceived: 0,
    mqttMessagesFailed: 0,
  },
  ...overrides,
});

describe('DisableDriverButton', () => {
  describe('button state', () => {
    it('shows "Disable" text when driver is enabled', () => {
      const driver = createMockDriver({ disabled: false });
      render(<DisableDriverButton driver={driver} />);

      expect(screen.getByText('Disable')).toBeDefined();
      expect(screen.queryByText('Enable')).toBeNull();
    });

    it('shows "Enable" text when driver is disabled', () => {
      const driver = createMockDriver({ disabled: true });
      render(<DisableDriverButton driver={driver} />);

      expect(screen.getByText('Enable')).toBeDefined();
      expect(screen.queryByText('Disable')).toBeNull();
    });

    it('uses outlined variant when driver is enabled', () => {
      const driver = createMockDriver({ disabled: false });
      render(<DisableDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('outlined');
    });

    it('uses contained variant when driver is disabled', () => {
      const driver = createMockDriver({ disabled: true });
      render(<DisableDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('contained');
    });
  });

  describe('click behavior', () => {
    it('calls setDriverDisabled with true when disabling', async () => {
      mockSetDriverDisabled.mockResolvedValue({ success: true });
      const driver = createMockDriver({ disabled: false });
      render(<DisableDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetDriverDisabled).toHaveBeenCalledWith('rgfx-driver-0001', true);
      });
    });

    it('calls setDriverDisabled with false when enabling', async () => {
      mockSetDriverDisabled.mockResolvedValue({ success: true });
      const driver = createMockDriver({ disabled: true });
      render(<DisableDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetDriverDisabled).toHaveBeenCalledWith('rgfx-driver-0001', false);
      });
    });

    it('handles API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
      mockSetDriverDisabled.mockRejectedValue(new Error('API error'));
      const driver = createMockDriver({ disabled: false });
      render(<DisableDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to toggle disabled state:',
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
