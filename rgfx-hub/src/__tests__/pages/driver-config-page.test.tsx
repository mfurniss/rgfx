/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DriverConfigPage from '@/renderer/pages/driver-config-page';
import { Driver, DriverTelemetry } from '@/types';

// Mock the stores
const mockAddNotification = vi.fn();
vi.mock('@/renderer/store/notification-store', () => ({
  useNotificationStore: vi.fn((selector) => {
    const state = { addNotification: mockAddNotification };
    return selector(state);
  }),
}));

// Create mock driver data
const createMockDriver = (mac: string, id: string): Driver => {
  const telemetry: DriverTelemetry = {
    chipModel: 'ESP32',
    chipRevision: 1,
    chipCores: 2,
    cpuFreqMHz: 240,
    flashSize: 4194304,
    flashSpeed: 40000000,
    heapSize: 327680,
    psramSize: 0,
    freePsram: 0,
    sketchSize: 1000000,
    freeSketchSpace: 3000000,
    firmwareVersion: '1.0.0',
    sdkVersion: '4.4.0',
    hasDisplay: false,
  };

  return new Driver({
    id,
    mac,
    ip: '192.168.1.50',
    hostname: id,
    ssid: 'TestNetwork',
    rssi: -50,
    freeHeap: 100000,
    minFreeHeap: 90000,
    uptimeMs: 1000,
    lastSeen: Date.now(),
    failedHeartbeats: 0,
    telemetry,
    stats: { mqttMessagesReceived: 0, mqttMessagesFailed: 0, udpMessagesSent: 0, udpMessagesFailed: 0 },
    connected: true,
    remoteLogging: 'errors',
    ledConfig: {
      hardwareRef: 'led-hardware/test-matrix.json',
      pin: 16,
    },
  });
};

// Variable to hold mock drivers for the store
let mockDrivers: Driver[] = [];

vi.mock('@/renderer/store/driver-store', () => ({
  useDriverStore: vi.fn((selector) => {
    const state = { drivers: mockDrivers };
    return selector(state);
  }),
}));

// Mock window.rgfx
const mockSaveDriverConfig = vi.fn();
const mockGetLEDHardwareList = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockDrivers = [];

  (window as Window & { rgfx: unknown }).rgfx = {
    saveDriverConfig: mockSaveDriverConfig,
    getLEDHardwareList: mockGetLEDHardwareList,
    onDriverConnected: vi.fn(() => vi.fn()),
    onDriverDisconnected: vi.fn(() => vi.fn()),
    onDriverUpdated: vi.fn(() => vi.fn()),
    onSystemStatus: vi.fn(() => vi.fn()),
    onEventCount: vi.fn(() => vi.fn()),
    onEventTopic: vi.fn(() => vi.fn()),
    onFlashOtaState: vi.fn(() => vi.fn()),
    onFlashOtaProgress: vi.fn(() => vi.fn()),
    rendererReady: vi.fn(),
    sendDriverCommand: vi.fn(),
    updateDriverConfig: vi.fn(),
    flashOTA: vi.fn(),
    triggerDiscovery: vi.fn(),
    triggerEffect: vi.fn(),
    openDriverLog: vi.fn(),
    simulateEvent: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
});

const renderWithRouter = (mac: string) => {
  return render(
    <MemoryRouter initialEntries={[`/driver/${mac}/config`]}>
      <Routes>
        <Route path="/driver/:mac/config" element={<DriverConfigPage />} />
        <Route path="/driver/:mac" element={<div>Driver Detail Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('DriverConfigPage', () => {
  describe('loading states', () => {

    it('shows not found when driver does not exist', () => {
      mockGetLEDHardwareList.mockResolvedValue([]);
      renderWithRouter('AA:BB:CC:DD:EE:FF');

      expect(screen.getByText('Driver Not Found')).toBeDefined();
      expect(screen.getByText(/No driver found with MAC/)).toBeDefined();
    });
  });

  describe('form display', () => {
    it('displays driver configuration form when driver exists', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createMockDriver(mac, 'test-driver')];
      mockGetLEDHardwareList.mockResolvedValue(['led-hardware/test-matrix.json']);

      renderWithRouter(mac);

      await waitFor(() => {
        expect(screen.getByText('Driver Configuration')).toBeDefined();
      });

      expect(screen.getByLabelText('Driver ID')).toBeDefined();
      expect(screen.getByLabelText('MAC Address')).toBeDefined();
    });

    it('populates form with driver data', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createMockDriver(mac, 'my-custom-driver')];
      mockGetLEDHardwareList.mockResolvedValue(['led-hardware/test-matrix.json']);

      renderWithRouter(mac);

      await waitFor(() => {
        const idInput: HTMLInputElement = screen.getByLabelText('Driver ID');
        expect(idInput.value).toBe('my-custom-driver');
      });

      const macInput: HTMLInputElement = screen.getByLabelText('MAC Address');
      expect(macInput.value).toBe(mac);
    });

    it('disables MAC address field', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createMockDriver(mac, 'test-driver')];
      mockGetLEDHardwareList.mockResolvedValue([]);

      renderWithRouter(mac);

      await waitFor(() => {
        const macInput = screen.getByLabelText('MAC Address');
        expect(macInput.getAttribute('disabled')).not.toBeNull();
      });
    });
  });

  describe('LED hardware selection', () => {
    it('shows loading state while fetching hardware options', () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createMockDriver(mac, 'test-driver')];
      // Don't resolve the promise yet - use a never-resolving promise
      mockGetLEDHardwareList.mockReturnValue(new Promise<string[]>(() => undefined));

      renderWithRouter(mac);

      expect(screen.getByText('Loading hardware options...')).toBeDefined();
    });

    it('shows warning when no hardware options available', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createMockDriver(mac, 'test-driver')];
      mockGetLEDHardwareList.mockResolvedValue([]);

      renderWithRouter(mac);

      await waitFor(() => {
        expect(screen.getByText(/No LED hardware definitions found/)).toBeDefined();
      });
    });

    it('displays hardware options in dropdown', async () => {
      const mac = '44:1D:64:F8:9A:58';
      // Create driver without LED config so we don't get out-of-range warning
      const driver = createMockDriver(mac, 'test-driver');
      driver.ledConfig = null;
      mockDrivers = [driver];
      mockGetLEDHardwareList.mockResolvedValue([
        'led-hardware/matrix-16x16.json',
        'led-hardware/strip-60.json',
      ]);

      renderWithRouter(mac);

      await waitFor(() => {
        expect(screen.getByText('LED Configuration')).toBeDefined();
      });

      // Verify the LED Hardware label is present (MUI renders it twice - label and legend)
      expect(screen.getAllByText('LED Hardware').length).toBeGreaterThan(0);
    });
  });

  describe('form submission', () => {
    it('calls saveDriverConfig on form submit', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createMockDriver(mac, 'test-driver')];
      mockGetLEDHardwareList.mockResolvedValue(['led-hardware/test-matrix.json']);
      mockSaveDriverConfig.mockResolvedValue(undefined);

      renderWithRouter(mac);

      await waitFor(() => {
        expect(screen.getByText('Save Configuration')).toBeDefined();
      });

      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveDriverConfig).toHaveBeenCalled();
      });
    });

    it('shows success notification on successful save', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createMockDriver(mac, 'test-driver')];
      mockGetLEDHardwareList.mockResolvedValue(['led-hardware/test-matrix.json']);
      mockSaveDriverConfig.mockResolvedValue(undefined);

      renderWithRouter(mac);

      await waitFor(() => {
        expect(screen.getByText('Save Configuration')).toBeDefined();
      });

      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Configuration saved',
            severity: 'success',
          }),
        );
      });
    });

    it('shows error notification on save failure', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createMockDriver(mac, 'test-driver')];
      mockGetLEDHardwareList.mockResolvedValue(['led-hardware/test-matrix.json']);
      mockSaveDriverConfig.mockRejectedValue(new Error('Save failed'));

      renderWithRouter(mac);

      await waitFor(() => {
        expect(screen.getByText('Save Configuration')).toBeDefined();
      });

      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Failed to save configuration'),
            severity: 'error',
          }),
        );
      });
    });
  });

  describe('exit button', () => {
    it('renders exit button', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createMockDriver(mac, 'test-driver')];
      mockGetLEDHardwareList.mockResolvedValue([]);

      renderWithRouter(mac);

      await waitFor(() => {
        expect(screen.getByText('Exit')).toBeDefined();
      });
    });
  });
});
