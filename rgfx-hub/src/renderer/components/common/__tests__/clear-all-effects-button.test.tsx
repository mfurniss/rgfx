import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClearAllEffectsButton } from '../clear-all-effects-button';
import { useDriverStore } from '@/renderer/store/driver-store';
import { useUiStore } from '@/renderer/store/ui-store';
import type { Driver } from '@/types';

const mockClearTransformerState = vi.fn();
const mockSendDriverCommand = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  (window as unknown as {
    rgfx: {
      clearTransformerState: typeof mockClearTransformerState;
      sendDriverCommand: typeof mockSendDriverCommand;
    };
  }).rgfx = {
    clearTransformerState: mockClearTransformerState,
    sendDriverCommand: mockSendDriverCommand,
  };
});

afterEach(() => {
  useDriverStore.setState({ drivers: [] });
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

describe('ClearAllEffectsButton', () => {
  describe('button state', () => {
    it('shows "Clear All Effects" text', () => {
      useDriverStore.setState({ drivers: [createMockDriver()] });
      render(<ClearAllEffectsButton />);

      expect(screen.getByText('Clear All Effects')).toBeDefined();
    });

    it('is disabled when no drivers are connected', () => {
      useDriverStore.setState({ drivers: [] });
      render(<ClearAllEffectsButton />);

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
    });

    it('is disabled when all drivers are disconnected', () => {
      useDriverStore.setState({
        drivers: [
          createMockDriver({ id: 'driver-1', state: 'disconnected' }),
          createMockDriver({ id: 'driver-2', state: 'disconnected' }),
        ],
      });
      render(<ClearAllEffectsButton />);

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
    });

    it('is enabled when at least one driver is connected', () => {
      useDriverStore.setState({
        drivers: [createMockDriver({ state: 'connected' })],
      });
      render(<ClearAllEffectsButton />);

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', false);
    });
  });

  describe('clear effects action', () => {
    it('calls clearTransformerState when clicked', async () => {
      mockClearTransformerState.mockResolvedValue(undefined);
      mockSendDriverCommand.mockResolvedValue({ success: true });

      useDriverStore.setState({
        drivers: [createMockDriver()],
      });
      render(<ClearAllEffectsButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockClearTransformerState).toHaveBeenCalledTimes(1);
      });
    });

    it('sends clear-effects command to all connected drivers', async () => {
      mockClearTransformerState.mockResolvedValue(undefined);
      mockSendDriverCommand.mockResolvedValue({ success: true });

      useDriverStore.setState({
        drivers: [
          createMockDriver({ id: 'driver-1', state: 'connected' }),
          createMockDriver({ id: 'driver-2', state: 'connected' }),
          createMockDriver({ id: 'driver-3', state: 'disconnected' }),
        ],
      });
      render(<ClearAllEffectsButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSendDriverCommand).toHaveBeenCalledWith('driver-1', 'clear-effects', '');
        expect(mockSendDriverCommand).toHaveBeenCalledWith('driver-2', 'clear-effects', '');
        expect(mockSendDriverCommand).toHaveBeenCalledTimes(2);
      });
    });

    it('resets all auto-trigger intervals to off', () => {
      mockClearTransformerState.mockResolvedValue(undefined);
      mockSendDriverCommand.mockResolvedValue({ success: true });

      useUiStore.getState().setSimulatorRow(0, 'event1', '5s');
      useUiStore.getState().setSimulatorRow(2, 'event2', '1s');

      useDriverStore.setState({
        drivers: [createMockDriver()],
      });
      render(<ClearAllEffectsButton />);

      fireEvent.click(screen.getByRole('button'));

      const { simulatorRows } = useUiStore.getState();
      simulatorRows.forEach((row) => {
        expect(row.autoInterval).toBe('off');
      });
    });

    it('handles driver command errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
      mockClearTransformerState.mockResolvedValue(undefined);
      mockSendDriverCommand.mockRejectedValue(new Error('Command failed'));

      useDriverStore.setState({
        drivers: [createMockDriver({ id: 'failing-driver' })],
      });
      render(<ClearAllEffectsButton />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to clear effects on driver:',
          'failing-driver',
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
