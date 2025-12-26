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
import { Driver } from '@/types';
import { createMockDriver } from '../factories';

// Mock the notification store
const mockNotify = vi.fn();
vi.mock('@/renderer/store/notification-store', () => ({
  notify: (...args: unknown[]) => mockNotify(...args),
}));

// Helper to create mock driver with ledConfig for this test file
const createTestDriver = (mac: string, id: string): Driver => {
  const driver = createMockDriver({ mac, id });
  driver.ledConfig = {
    hardwareRef: 'led-hardware/test-matrix.json',
    pin: 16,
    gamma: { r: 2.8, g: 2.8, b: 2.8 },
    floor: { r: 0, g: 0, b: 0 },
  };
  return driver;
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
    onDriverRestarting: vi.fn(() => vi.fn()),
    onSystemStatus: vi.fn(() => vi.fn()),
    onFlashOtaState: vi.fn(() => vi.fn()),
    onFlashOtaProgress: vi.fn(() => vi.fn()),
    rendererReady: vi.fn(),
    sendDriverCommand: vi.fn(),
    updateDriverConfig: vi.fn(),
    flashOTA: vi.fn(),
    triggerDiscovery: vi.fn(),
    triggerEffect: vi.fn(),
    openDriverLog: vi.fn(),
    openFile: vi.fn(),
    listGames: vi.fn(),
    simulateEvent: vi.fn(),
    selectDirectory: vi.fn(),
    verifyDirectory: vi.fn(),
    getFirmwareManifest: vi.fn(),
    getFirmwareFile: vi.fn(),
    setDriverDisabled: vi.fn(),
    onEvent: vi.fn(() => vi.fn()),
    resetEventCounts: vi.fn(),
    restartDriver: vi.fn(),
    deleteDriver: vi.fn(),
    onDriverDeleted: vi.fn(() => vi.fn()),
    getAppInfo: vi.fn().mockResolvedValue({
      version: '0.0.1-test',
      licensePath: '/mock/LICENSE',
      defaultRgfxConfigDir: '/mock/.rgfx',
      defaultMameRomsDir: '/mock/mame-roms',
    }),
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
      mockDrivers = [createTestDriver(mac, 'test-driver')];
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
      mockDrivers = [createTestDriver(mac, 'my-custom-driver')];
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
      mockDrivers = [createTestDriver(mac, 'test-driver')];
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
      mockDrivers = [createTestDriver(mac, 'test-driver')];
      // Don't resolve the promise yet - use a never-resolving promise
      mockGetLEDHardwareList.mockReturnValue(new Promise<string[]>(() => undefined));

      renderWithRouter(mac);

      expect(screen.getByText('Loading hardware options...')).toBeDefined();
    });

    it('shows warning when no hardware options available', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createTestDriver(mac, 'test-driver')];
      mockGetLEDHardwareList.mockResolvedValue([]);

      renderWithRouter(mac);

      await waitFor(() => {
        expect(screen.getByText(/No LED hardware definitions found/)).toBeDefined();
      });
    });

    it('displays hardware options in dropdown', async () => {
      const mac = '44:1D:64:F8:9A:58';
      // Create driver without LED config so we don't get out-of-range warning
      const driver = createTestDriver(mac, 'test-driver');
      driver.ledConfig = null;
      mockDrivers = [driver];
      mockGetLEDHardwareList.mockResolvedValue([
        'led-hardware/matrix-16x16.json',
        'led-hardware/strip-60.json',
      ]);

      renderWithRouter(mac);

      // Wait for hardware options to load and LED Hardware dropdown to appear
      await waitFor(() => {
        expect(screen.getAllByText('LED Hardware').length).toBeGreaterThan(0);
      });
    });
  });

  describe('form submission', () => {
    // Helper to create a minimal valid driver (no ledConfig to avoid gamma field complexity)
    const createMinimalDriver = (mac: string, id: string): Driver => {
      const driver = createMockDriver({ mac, id });
      driver.ledConfig = null;
      return driver;
    };

    it('calls saveDriverConfig on form submit', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createMinimalDriver(mac, 'test-driver')];
      mockGetLEDHardwareList.mockResolvedValue(['led-hardware/test-matrix.json']);
      mockSaveDriverConfig.mockResolvedValue(undefined);

      renderWithRouter(mac);

      // Wait for form to be fully valid (button enabled)
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save Configuration/i });
        expect(saveButton.getAttribute('disabled')).toBeNull();
      });

      // Click outside of waitFor to avoid multiple clicks on retry
      const saveButton = screen.getByRole('button', { name: /Save Configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveDriverConfig).toHaveBeenCalled();
      });
    });

    it('shows success notification on successful save', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createMinimalDriver(mac, 'test-driver')];
      mockGetLEDHardwareList.mockResolvedValue(['led-hardware/test-matrix.json']);
      mockSaveDriverConfig.mockResolvedValue(undefined);

      renderWithRouter(mac);

      // Wait for form to be valid
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save Configuration/i });
        expect(saveButton.getAttribute('disabled')).toBeNull();
      });

      const saveButton = screen.getByRole('button', { name: /Save Configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith('test-driver configuration saved', 'success');
      });
    });

    it('shows error notification on save failure', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createMinimalDriver(mac, 'test-driver')];
      mockGetLEDHardwareList.mockResolvedValue(['led-hardware/test-matrix.json']);
      mockSaveDriverConfig.mockRejectedValue(new Error('Save failed'));

      renderWithRouter(mac);

      // Wait for form to be valid
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save Configuration/i });
        expect(saveButton.getAttribute('disabled')).toBeNull();
      });

      const saveButton = screen.getByRole('button', { name: /Save Configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith(
          expect.stringContaining('test-driver failed to save'),
          'error',
        );
      });
    });
  });

  describe('exit button', () => {
    it('renders exit button', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createTestDriver(mac, 'test-driver')];
      mockGetLEDHardwareList.mockResolvedValue([]);

      renderWithRouter(mac);

      await waitFor(() => {
        expect(screen.getByText('Exit')).toBeDefined();
      });
    });
  });
});
