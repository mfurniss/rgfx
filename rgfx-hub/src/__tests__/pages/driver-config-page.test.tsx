import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DriverConfigPage from '@/renderer/pages/driver-config-page';
import { Driver } from '@/types';
import { createMockDriver } from '../factories';
import { installRgfxMock, type MockRgfxAPI } from '../create-rgfx-mock';

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

let mock: MockRgfxAPI;

beforeEach(() => {
  vi.clearAllMocks();
  mockDrivers = [];

  mock = installRgfxMock({
    getLEDHardware: vi.fn().mockResolvedValue(null),
    getAppInfo: vi.fn().mockResolvedValue({
      version: '0.0.1-test',
      licensePath: '/mock/LICENSE',
      defaultRgfxConfigDir: '/mock/.rgfx',
      defaultMameRomsDir: '/mock/mame-roms',
    }),
    getLogSizes: vi.fn().mockResolvedValue({
      system: null, events: null, drivers: [],
    }),
  });
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
      mock.getLEDHardwareList.mockResolvedValue([]);
      renderWithRouter('AA:BB:CC:DD:EE:FF');

      expect(screen.getByText('Driver Not Found')).toBeDefined();
      expect(screen.getByText(/No driver found with MAC/)).toBeDefined();
    });
  });

  describe('form display', () => {
    it('displays driver configuration form when driver exists', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createTestDriver(mac, 'test-driver')];
      mock.getLEDHardwareList.mockResolvedValue(['led-hardware/test-matrix.json']);

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
      mock.getLEDHardwareList.mockResolvedValue(['led-hardware/test-matrix.json']);

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
      mock.getLEDHardwareList.mockResolvedValue([]);

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
      mock.getLEDHardwareList.mockReturnValue(new Promise<string[]>(() => undefined));

      renderWithRouter(mac);

      expect(screen.getByText('Loading hardware options...')).toBeDefined();
    });

    it('shows warning when no hardware options available', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createTestDriver(mac, 'test-driver')];
      mock.getLEDHardwareList.mockResolvedValue([]);

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
      mock.getLEDHardwareList.mockResolvedValue([
        'led-hardware/matrix-16x16.json',
        'led-hardware/strip-60.json',
      ]);

      renderWithRouter(mac);

      // Wait for hardware options to load and LED Hardware dropdown to appear
      await waitFor(() => {
        expect(screen.getAllByText('LED Hardware').length).toBeGreaterThan(0);
      });
    });

    it('applies default values when new LED hardware is configured', async () => {
      const mac = '44:1D:64:F8:9A:58';
      // Create driver WITHOUT existing ledConfig (new configuration)
      const driver = createMockDriver({ mac, id: 'test-driver' });
      driver.ledConfig = null;
      mockDrivers = [driver];
      mock.getLEDHardwareList.mockResolvedValue(['led-hardware/test-matrix.json']);
      mock.saveDriverConfig.mockResolvedValue(undefined);

      renderWithRouter(mac);

      // Wait for hardware dropdown to be available
      await waitFor(() => {
        expect(screen.getByTestId('led-hardware-select')).toBeDefined();
      });

      // Open the LED Hardware select dropdown
      const select = screen.getByTestId('led-hardware-select');
      fireEvent.mouseDown(select);

      // Find and click the hardware option
      const listbox = await screen.findByRole('listbox');
      const option = within(listbox).getByText(/test-matrix/i);
      fireEvent.click(option);

      // Wait for form to update and check that defaults were applied
      await waitFor(() => {
        const brightnessInput: HTMLInputElement = screen.getByLabelText(/Maximum Brightness/i);
        expect(brightnessInput.value).toBe('128');
      });

      const powerInput: HTMLInputElement = screen.getByLabelText(/Max Power \(mA\)/i);
      expect(powerInput.value).toBe('500');
    });

    it('preserves existing values when switching LED hardware', async () => {
      const mac = '44:1D:64:F8:9A:58';
      // Create driver WITH existing ledConfig (not a new configuration)
      const driver = createMockDriver({ mac, id: 'test-driver' });
      driver.ledConfig = {
        hardwareRef: 'led-hardware/old-hardware.json',
        pin: 16,
        globalBrightnessLimit: 200,
        maxPowerMilliamps: 1000,
        gamma: { r: 2.8, g: 2.8, b: 2.8 },
        floor: { r: 0, g: 0, b: 0 },
      };
      mockDrivers = [driver];
      mock.getLEDHardwareList.mockResolvedValue([
        'led-hardware/old-hardware.json',
        'led-hardware/test-matrix.json',
      ]);
      mock.saveDriverConfig.mockResolvedValue(undefined);

      renderWithRouter(mac);

      // Wait for form to show the brightness field (ledConfig is already set)
      await waitFor(() => {
        expect(screen.getByLabelText(/Maximum Brightness/i)).toBeDefined();
      });

      // Open the LED Hardware select dropdown
      const select = screen.getByTestId('led-hardware-select');
      fireEvent.mouseDown(select);

      // Find and click the different hardware option
      const listbox = await screen.findByRole('listbox');
      const option = within(listbox).getByText(/test-matrix/i);
      fireEvent.click(option);

      // Existing values should be preserved, not replaced with defaults
      await waitFor(() => {
        const brightnessInput: HTMLInputElement = screen.getByLabelText(/Maximum Brightness/i);
        expect(brightnessInput.value).toBe('200');
      });

      const powerInput: HTMLInputElement = screen.getByLabelText(/Max Power \(mA\)/i);
      expect(powerInput.value).toBe('1000');
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
      mock.getLEDHardwareList.mockResolvedValue(['led-hardware/test-matrix.json']);
      mock.saveDriverConfig.mockResolvedValue(undefined);

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
        expect(mock.saveDriverConfig).toHaveBeenCalled();
      });
    });

    it('shows success notification on successful save', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createMinimalDriver(mac, 'test-driver')];
      mock.getLEDHardwareList.mockResolvedValue(['led-hardware/test-matrix.json']);
      mock.saveDriverConfig.mockResolvedValue(undefined);

      renderWithRouter(mac);

      // Wait for form to be valid
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save Configuration/i });
        expect(saveButton.getAttribute('disabled')).toBeNull();
      });

      const saveButton = screen.getByRole('button', { name: /Save Configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith('test-driver configuration saved', 'info');
      });
    });

    it('shows error notification on save failure', async () => {
      const mac = '44:1D:64:F8:9A:58';
      mockDrivers = [createMinimalDriver(mac, 'test-driver')];
      mock.getLEDHardwareList.mockResolvedValue(['led-hardware/test-matrix.json']);
      mock.saveDriverConfig.mockRejectedValue(new Error('Save failed'));

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
      mock.getLEDHardwareList.mockResolvedValue([]);

      renderWithRouter(mac);

      await waitFor(() => {
        expect(screen.getByText('Exit')).toBeDefined();
      });
    });
  });
});
