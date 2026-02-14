/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FirmwarePage from '../firmware-page';
import { useUiStore } from '../../store/ui-store';
import { useFlashState } from '../../hooks/use-flash-state';

// Mock all child components
vi.mock('../../components/common/log-display', () => ({
  default: () => <div data-testid="log-display">LogDisplay</div>,
}));

vi.mock('../../components/firmware/flash-result-dialog', () => ({
  default: () => <div data-testid="flash-result-dialog">FlashResultDialog</div>,
}));

vi.mock('../../components/firmware/confirm-flash-dialog', () => ({
  default: () => <div data-testid="confirm-flash-dialog">ConfirmFlashDialog</div>,
}));

vi.mock('../../components/firmware/serial-port-selector', () => ({
  default: () => <div data-testid="serial-port-selector">SerialPortSelector</div>,
}));

vi.mock('../../components/firmware/wifi-config-button', () => ({
  default: () => <button data-testid="wifi-config-button">Configure WiFi</button>,
}));

vi.mock('../../components/firmware/wifi-config-ota-button', () => ({
  default: () => <button data-testid="wifi-config-ota-button">Configure WiFi OTA</button>,
}));

vi.mock('../../components/driver/target-drivers-picker', () => ({
  TargetDriversPicker: () => <div data-testid="target-drivers-picker">TargetDriversPicker</div>,
}));

vi.mock('../../components/layout/page-title', () => ({
  PageTitle: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

// Mock stores
vi.mock('../../store/driver-store', () => ({
  useDriverStore: vi.fn((selector) => {
    const state = { drivers: [] };
    return selector(state);
  }),
}));

vi.mock('../../store/system-status-store', () => ({
  useSystemStatusStore: vi.fn((selector) => {
    const state = {
      systemStatus: {
        firmwareVersions: { esp32: '1.0.0', esp32s3: '1.0.0' },
      },
    };
    return selector(state);
  }),
}));

vi.mock('../../store/ui-store', () => ({
  useUiStore: vi.fn((selector) => {
    const state = {
      firmwareFlashMethod: 'usb',
      firmwareDriverFlashStatus: {},
      setFirmwareState: vi.fn(),
      setFirmwareDriverFlashStatus: vi.fn(),
      isFlashingFirmware: false,
      setIsFlashingFirmware: vi.fn(),
    };
    return selector(state);
  }),
}));

// Mock hooks
vi.mock('../../hooks/use-flash-state', () => ({
  useFlashState: vi.fn(() => ({
    progress: 0,
    driverFlashStatus: new Map(),
    logMessages: [],
    error: null,
    resultModal: { open: false, success: false, message: '', flashMethod: null },
    setProgress: vi.fn(),
    setDriverFlashStatus: vi.fn(),
    addLog: vi.fn(),
    clearLogs: vi.fn(),
    setError: vi.fn(),
    showResult: vi.fn(),
    closeResult: vi.fn(),
    resetForNewFlash: vi.fn(),
  })),
}));

vi.mock('../../hooks/use-ota-flash-events', () => ({
  useOtaFlashEvents: vi.fn(),
}));

vi.mock('../../services/usb-flash-service', () => ({
  flashViaUSB: vi.fn(),
}));

vi.mock('../../services/ota-flash-service', () => ({
  flashViaOTA: vi.fn(),
  getDriversToFlash: vi.fn().mockReturnValue([]),
  generateResultMessage: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('FirmwarePage', () => {
  describe('page rendering', () => {
    it('renders page title', () => {
      render(<FirmwarePage />);
      expect(screen.getByText('Firmware')).toBeDefined();
    });

    it('renders Update Method section', () => {
      render(<FirmwarePage />);
      expect(screen.getByText('Update Method')).toBeDefined();
    });

    it('renders method toggle buttons', () => {
      render(<FirmwarePage />);
      expect(screen.getByText('OTA WiFi')).toBeDefined();
      expect(screen.getByText('USB Serial')).toBeDefined();
    });

    it('renders LogDisplay component', () => {
      render(<FirmwarePage />);
      expect(screen.getByTestId('log-display')).toBeDefined();
    });

    it('renders FlashResultDialog component', () => {
      render(<FirmwarePage />);
      expect(screen.getByTestId('flash-result-dialog')).toBeDefined();
    });

    it('renders ConfirmFlashDialog component', () => {
      render(<FirmwarePage />);
      expect(screen.getByTestId('confirm-flash-dialog')).toBeDefined();
    });
  });

  describe('flash method selection', () => {
    it('shows USB Serial content by default when no drivers', () => {
      render(<FirmwarePage />);

      expect(screen.getByTestId('serial-port-selector')).toBeDefined();
      expect(screen.getByTestId('wifi-config-button')).toBeDefined();
    });

    it('shows different content for OTA method', () => {
      render(<FirmwarePage />);

      // Click OTA button
      fireEvent.click(screen.getByText('OTA WiFi'));

      expect(screen.getByTestId('target-drivers-picker')).toBeDefined();
      expect(screen.getByTestId('wifi-config-ota-button')).toBeDefined();
    });

    it('shows Update Firmware button', () => {
      render(<FirmwarePage />);
      expect(screen.getByText('Update Firmware')).toBeDefined();
    });
  });

  describe('method descriptions', () => {
    it('shows USB description when USB selected', () => {
      render(<FirmwarePage />);

      expect(screen.getByText(/Connect a new ESP32 or existing driver via USB/)).toBeDefined();
    });

    it('shows OTA description when OTA selected', () => {
      render(<FirmwarePage />);

      fireEvent.click(screen.getByText('OTA WiFi'));

      expect(screen.getByText(/Update firmware on already-configured drivers over WiFi/)).toBeDefined();
    });
  });

  describe('error alert', () => {
    it('shows error alert when not flashing and error exists', () => {
      vi.mocked(useFlashState).mockReturnValue({
        progress: 0,
        driverFlashStatus: new Map(),
        logMessages: [],
        error: 'No connected drivers selected',
        resultModal: { open: false, success: false, message: '', flashMethod: null },
        setProgress: vi.fn(),
        setDriverFlashStatus: vi.fn(),
        addLog: vi.fn(),
        clearLogs: vi.fn(),
        setError: vi.fn(),
        showResult: vi.fn(),
        closeResult: vi.fn(),
        resetForNewFlash: vi.fn(),
      });

      render(<FirmwarePage />);

      expect(screen.getByText('No connected drivers selected')).toBeDefined();
    });

    it('hides error alert when flashing is in progress', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useUiStore).mockImplementation(((selector: any) => {
        const state = {
          firmwareFlashMethod: 'ota',
          firmwareDriverFlashStatus: {},
          setFirmwareState: vi.fn(),
          setFirmwareDriverFlashStatus: vi.fn(),
          isFlashingFirmware: true,
          setIsFlashingFirmware: vi.fn(),
        };
        return selector(state);
      }) as any);

      vi.mocked(useFlashState).mockReturnValue({
        progress: 0,
        driverFlashStatus: new Map(),
        logMessages: [],
        error: 'No connected drivers selected',
        resultModal: { open: false, success: false, message: '', flashMethod: null },
        setProgress: vi.fn(),
        setDriverFlashStatus: vi.fn(),
        addLog: vi.fn(),
        clearLogs: vi.fn(),
        setError: vi.fn(),
        showResult: vi.fn(),
        closeResult: vi.fn(),
        resetForNewFlash: vi.fn(),
      });

      render(<FirmwarePage />);

      expect(screen.queryByText('No connected drivers selected')).toBeNull();
    });
  });
});
