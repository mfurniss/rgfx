import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RestartDriverButton from '../restart-driver-button';
import type { Driver } from '@/types';

const mockRestartDriver = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  (window as unknown as { rgfx: { restartDriver: typeof mockRestartDriver } }).rgfx = {
    restartDriver: mockRestartDriver,
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

describe('RestartDriverButton', () => {
  describe('button state', () => {
    it('shows "Restart" text', () => {
      const driver = createMockDriver();
      render(<RestartDriverButton driver={driver} />);

      expect(screen.getByText('Restart')).toBeDefined();
    });

    it('is disabled when driver is not connected', () => {
      const driver = createMockDriver({ state: 'disconnected' });
      render(<RestartDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
    });

    it('is enabled when driver is connected', () => {
      const driver = createMockDriver({ state: 'connected' });
      render(<RestartDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', false);
    });
  });

  describe('confirmation dialog', () => {
    it('opens dialog when button is clicked', () => {
      const driver = createMockDriver();
      render(<RestartDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('Confirm Restart')).toBeDefined();
      expect(screen.getByText(/This will restart/)).toBeDefined();
    });

    it('displays driver id in dialog', () => {
      const driver = createMockDriver({ id: 'my-test-driver' });
      render(<RestartDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('my-test-driver')).toBeDefined();
    });

    it('closes dialog when Cancel is clicked', async () => {
      const driver = createMockDriver();
      render(<RestartDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Confirm Restart')).toBeNull();
      });
    });

    it('calls restartDriver when Restart is confirmed', async () => {
      mockRestartDriver.mockResolvedValue({ success: true });
      const driver = createMockDriver();
      render(<RestartDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const restartButton = screen.getByRole('button', { name: 'Restart' });
      fireEvent.click(restartButton);

      await waitFor(() => {
        expect(mockRestartDriver).toHaveBeenCalledWith('rgfx-driver-0001');
      });
    });

    it('closes dialog after confirming restart', async () => {
      mockRestartDriver.mockResolvedValue({ success: true });
      const driver = createMockDriver();
      render(<RestartDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const restartButton = screen.getByRole('button', { name: 'Restart' });
      fireEvent.click(restartButton);

      await waitFor(() => {
        expect(screen.queryByText('Confirm Restart')).toBeNull();
      });
    });
  });

  describe('error handling', () => {
    it('handles API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
      mockRestartDriver.mockRejectedValue(new Error('API error'));
      const driver = createMockDriver();
      render(<RestartDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const restartButton = screen.getByRole('button', { name: 'Restart' });
      fireEvent.click(restartButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to restart driver:',
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
