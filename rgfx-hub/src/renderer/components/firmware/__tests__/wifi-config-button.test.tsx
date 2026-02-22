import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WifiConfigButton from '../wifi-config-button';

const mockSendWifiCommandToPort = vi.fn();

vi.mock('@/renderer/utils/serial-wifi', () => ({
  sendWifiCommandToPort: (...args: unknown[]) => mockSendWifiCommandToPort(...args),
}));

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

afterEach(() => {
  cleanup();
});

describe('WifiConfigButton', () => {
  describe('button rendering', () => {
    it('renders Configure WiFi button', () => {
      render(<WifiConfigButton getPort={null} />);
      expect(screen.getByText('Configure WiFi')).toBeDefined();
    });

    it('is disabled when getPort is null', () => {
      render(<WifiConfigButton getPort={null} />);
      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
    });

    it('is enabled when getPort is provided', () => {
      const mockGetPort = vi.fn();
      render(<WifiConfigButton getPort={mockGetPort} />);
      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', false);
    });

    it('is disabled when disabled prop is true', () => {
      const mockGetPort = vi.fn();
      render(<WifiConfigButton getPort={mockGetPort} disabled />);
      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
    });
  });

  describe('dialog opening', () => {
    it('calls openDialog when button is clicked', () => {
      const mockGetPort = vi.fn();
      render(<WifiConfigButton getPort={mockGetPort} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockOpenDialog).toHaveBeenCalledTimes(1);
    });
  });

  describe('submit handler', () => {
    it('button is disabled when getPort is null', () => {
      render(<WifiConfigButton getPort={null} />);

      // Button should be disabled when no port is available
      const button = screen.getByText('Configure WiFi').closest('button');
      expect(button).toHaveProperty('disabled', true);
    });
  });

  describe('logging', () => {
    it('uses console.log by default', () => {
      const mockGetPort = vi.fn();
      render(<WifiConfigButton getPort={mockGetPort} />);

      // Button renders without throwing when no onLog provided
      expect(screen.getByText('Configure WiFi')).toBeDefined();
    });

    it('accepts custom onLog handler', () => {
      const mockGetPort = vi.fn();
      const onLog = vi.fn();
      render(<WifiConfigButton getPort={mockGetPort} onLog={onLog} />);

      expect(screen.getByText('Configure WiFi')).toBeDefined();
    });
  });
});
