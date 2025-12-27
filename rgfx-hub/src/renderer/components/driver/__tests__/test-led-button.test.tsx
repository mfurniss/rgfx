import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestLedButton from '../test-led-button';
import type { Driver, DriverLEDConfig } from '@/types';

const mockSendDriverCommand = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  (window as unknown as { rgfx: { sendDriverCommand: typeof mockSendDriverCommand } }).rgfx = {
    sendDriverCommand: mockSendDriverCommand,
  };
});

afterEach(() => {
  cleanup();
});

const createMockLedConfig = (): DriverLEDConfig => ({
  hardwareRef: 'test-hardware',
  pin: 16,
  maxBrightness: 255,
  globalBrightnessLimit: 128,
  dithering: true,
  gamma: { r: 2.8, g: 2.8, b: 2.8 },
  floor: { r: 0, g: 0, b: 0 },
});

const createMockDriver = (overrides: Partial<Driver> = {}): Driver => ({
  id: 'rgfx-driver-0001',
  state: 'connected',
  lastSeen: Date.now(),
  failedHeartbeats: 0,
  ip: '192.168.1.50',
  disabled: false,
  testActive: false,
  ledConfig: createMockLedConfig(),
  stats: {
    telemetryEventsReceived: 0,
    mqttMessagesReceived: 0,
    mqttMessagesFailed: 0,
  },
  ...overrides,
});

describe('TestLedButton', () => {
  describe('disabled state', () => {
    it('is disabled when driver is not connected', () => {
      const driver = createMockDriver({ state: 'disconnected' });
      render(<TestLedButton driver={driver} />);

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
    });

    it('is disabled when driver has no LED config', () => {
      const driver = createMockDriver({ ledConfig: undefined });
      render(<TestLedButton driver={driver} />);

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
    });

    it('is enabled when driver is connected and has LED config', () => {
      const driver = createMockDriver();
      render(<TestLedButton driver={driver} />);

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', false);
    });
  });

  describe('button appearance', () => {
    it('shows "Test LEDs OFF" when test is not active', () => {
      const driver = createMockDriver({ testActive: false });
      render(<TestLedButton driver={driver} />);

      expect(screen.getByText('Test LEDs OFF')).toBeDefined();
    });

    it('shows "Test LEDs ON" when test is active', () => {
      const driver = createMockDriver({ testActive: true });
      render(<TestLedButton driver={driver} />);

      expect(screen.getByText('Test LEDs ON')).toBeDefined();
    });

    it('uses outlined variant when test is not active', () => {
      const driver = createMockDriver({ testActive: false });
      render(<TestLedButton driver={driver} />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('outlined');
    });

    it('uses contained variant when test is active', () => {
      const driver = createMockDriver({ testActive: true });
      render(<TestLedButton driver={driver} />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('contained');
    });
  });

  describe('click behavior', () => {
    it('sends test on command when test is not active', async () => {
      mockSendDriverCommand.mockResolvedValue({ success: true });
      const driver = createMockDriver({ testActive: false });
      render(<TestLedButton driver={driver} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSendDriverCommand).toHaveBeenCalledWith('rgfx-driver-0001', 'test', 'on');
      });
    });

    it('sends test off command when test is active', async () => {
      mockSendDriverCommand.mockResolvedValue({ success: true });
      const driver = createMockDriver({ testActive: true });
      render(<TestLedButton driver={driver} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSendDriverCommand).toHaveBeenCalledWith('rgfx-driver-0001', 'test', 'off');
      });
    });

    it('shows "Processing..." while request is pending', () => {
      mockSendDriverCommand.mockImplementation(
        () => new Promise((resolve) => {
          setTimeout(() => {
            resolve({ success: true });
          }, 100);
        }),
      );
      const driver = createMockDriver({ testActive: false });
      render(<TestLedButton driver={driver} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('Processing...')).toBeDefined();
    });

    it('handles API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
      mockSendDriverCommand.mockRejectedValue(new Error('API error'));
      const driver = createMockDriver({ testActive: false });
      render(<TestLedButton driver={driver} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to toggle test mode:',
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
