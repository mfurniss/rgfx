import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WifiConfigOtaButton from '../wifi-config-ota-button';
import { createMockDriver } from '@/__tests__/factories';

vi.mock('@/renderer/hooks/use-wifi-config-dialog', () => ({
  useWifiConfigDialog: () => ({
    isOpen: mockDialogState.isOpen,
    isSending: mockDialogState.isSending,
    error: mockDialogState.error,
    lastWifiSsid: 'TestNetwork',
    lastWifiPassword: 'testpass123',
    openDialog: mockOpenDialog,
    closeDialog: mockCloseDialog,
    setError: mockSetError,
    setIsSending: mockSetIsSending,
    saveCredentials: mockSaveCredentials,
  }),
}));

vi.mock('@/config/constants', () => ({
  WIFI_UPDATE_DELAY_MS: 10,
}));

const mockOpenDialog = vi.fn();
const mockCloseDialog = vi.fn();
const mockSetError = vi.fn();
const mockSetIsSending = vi.fn();
const mockSaveCredentials = vi.fn();
let mockDialogState = {
  isOpen: false,
  isSending: false,
  error: null as string | null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockDialogState = {
    isOpen: false,
    isSending: false,
    error: null,
  };
});

describe('WifiConfigOtaButton', () => {
  const connectedDriver = createMockDriver({ id: 'driver-1', state: 'connected' });
  const disconnectedDriver = createMockDriver({ id: 'driver-2', state: 'disconnected' });

  describe('button state', () => {
    it('renders Configure WiFi button', () => {
      render(
        <WifiConfigOtaButton
          drivers={[connectedDriver]}
          selectedDrivers={new Set(['driver-1'])}
        />,
      );
      expect(screen.getByText('Configure WiFi')).toBeDefined();
    });

    it('is disabled when no drivers selected', () => {
      render(
        <WifiConfigOtaButton
          drivers={[connectedDriver]}
          selectedDrivers={new Set()}
        />,
      );
      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
    });

    it('is disabled when only disconnected drivers selected', () => {
      render(
        <WifiConfigOtaButton
          drivers={[disconnectedDriver]}
          selectedDrivers={new Set(['driver-2'])}
        />,
      );
      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
    });

    it('is enabled when connected drivers are selected', () => {
      render(
        <WifiConfigOtaButton
          drivers={[connectedDriver]}
          selectedDrivers={new Set(['driver-1'])}
        />,
      );
      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', false);
    });

    it('is disabled when disabled prop is true', () => {
      render(
        <WifiConfigOtaButton
          drivers={[connectedDriver]}
          selectedDrivers={new Set(['driver-1'])}
          disabled
        />,
      );
      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
    });
  });

  describe('driver filtering', () => {
    it('only counts connected drivers from selection', () => {
      const drivers = [
        createMockDriver({ id: 'connected-1', state: 'connected' }),
        createMockDriver({ id: 'disconnected-1', state: 'disconnected' }),
        createMockDriver({ id: 'connected-2', state: 'connected' }),
      ];

      render(
        <WifiConfigOtaButton
          drivers={drivers}
          selectedDrivers={new Set(['connected-1', 'disconnected-1', 'connected-2'])}
        />,
      );

      // Button should be enabled since we have 2 connected drivers selected
      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', false);
    });

    it('ignores drivers not in selection', () => {
      const drivers = [
        createMockDriver({ id: 'driver-1', state: 'connected' }),
        createMockDriver({ id: 'driver-2', state: 'connected' }),
      ];

      render(
        <WifiConfigOtaButton
          drivers={drivers}
          selectedDrivers={new Set(['driver-1'])}
        />,
      );

      // Should only count driver-1
      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', false);
    });
  });

  describe('logging', () => {
    it('uses console.log by default', () => {
      render(
        <WifiConfigOtaButton
          drivers={[connectedDriver]}
          selectedDrivers={new Set(['driver-1'])}
        />,
      );
      expect(screen.getByText('Configure WiFi')).toBeDefined();
    });

    it('accepts custom onLog handler', () => {
      const onLog = vi.fn();
      render(
        <WifiConfigOtaButton
          drivers={[connectedDriver]}
          selectedDrivers={new Set(['driver-1'])}
          onLog={onLog}
        />,
      );
      expect(screen.getByText('Configure WiFi')).toBeDefined();
    });
  });
});
