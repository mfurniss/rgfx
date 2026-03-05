import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DriverCard from '../driver-card';
import { createMockDriver } from '@/__tests__/factories';
import { createMockTelemetry } from '@/__tests__/factories/telemetry.factory';

const mockNavigate = vi.fn();
const mockLocation = { pathname: '/drivers/AA:BB:CC:DD:EE:FF' };
const mockOpenDriverLog = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

vi.mock('@/renderer/store/system-status-store', () => ({
  useSystemStatusStore: vi.fn((selector) => {
    const state = {
      systemStatus: {
        firmwareVersions: { esp32: '1.0.0', esp32s3: '1.0.0' },
      },
    };
    return selector(state);
  }),
}));

vi.mock('@/config/constants', () => ({
  UI_TIMESTAMP_UPDATE_INTERVAL_MS: 1000,
}));

// Mock child components to isolate driver-card tests
vi.mock('../driver-state', () => ({
  default: () => <span data-testid="driver-state">DriverState</span>,
}));

vi.mock('../test-led-button', () => ({
  default: () => <button data-testid="test-led-button">Test LED</button>,
}));

vi.mock('../reset-driver-button', () => ({
  default: () => <button data-testid="reset-driver-button">Reset</button>,
}));

vi.mock('../restart-driver-button', () => ({
  default: () => <button data-testid="restart-driver-button">Restart</button>,
}));

vi.mock('../disable-driver-button', () => ({
  default: () => <button data-testid="disable-driver-button">Disable</button>,
}));

vi.mock('../delete-driver-button', () => ({
  default: () => <button data-testid="delete-driver-button">Delete</button>,
}));

vi.mock('../../charts/telemetry-charts', () => ({
  default: () => <div data-testid="telemetry-charts">TelemetryCharts</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();

  (window as unknown as { rgfx: { openDriverLog: typeof mockOpenDriverLog } }).rgfx = {
    openDriverLog: mockOpenDriverLog,
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DriverCard', () => {
  describe('header rendering', () => {
    it('displays driver ID', () => {
      const driver = createMockDriver({ id: 'test-driver-123' });
      render(<DriverCard driver={driver} />);

      expect(screen.getByText('test-driver-123')).toBeDefined();
    });

    it('renders back button', () => {
      const driver = createMockDriver();
      render(<DriverCard driver={driver} />);

      expect(screen.getByLabelText('Back to Drivers')).toBeDefined();
    });

    it('navigates to /drivers when back button clicked', () => {
      const driver = createMockDriver();
      render(<DriverCard driver={driver} />);

      fireEvent.click(screen.getByLabelText('Back to Drivers'));

      expect(mockNavigate).toHaveBeenCalledWith('/drivers');
    });

    it('renders DriverState component', () => {
      const driver = createMockDriver();
      render(<DriverCard driver={driver} />);

      expect(screen.getByTestId('driver-state')).toBeDefined();
    });
  });

  describe('action buttons', () => {
    it('renders Test LED button when ledConfig exists', () => {
      const driver = createMockDriver({
        ledConfig: {
          hardwareRef: 'led-hardware/test.json',
          pin: 16,
          gamma: { r: 2.8, g: 2.8, b: 2.8 },
          floor: { r: 0, g: 0, b: 0 },
        },
      });
      render(<DriverCard driver={driver} />);

      expect(screen.getByTestId('test-led-button')).toBeDefined();
    });

    it('does not render Test LED button when ledConfig is null', () => {
      const driver = createMockDriver({ ledConfig: undefined });
      render(<DriverCard driver={driver} />);

      expect(screen.queryByTestId('test-led-button')).toBeNull();
    });

    it('renders Configure Driver button', () => {
      const driver = createMockDriver();
      render(<DriverCard driver={driver} />);

      expect(screen.getByText('Configure Driver')).toBeDefined();
    });

    it('navigates to config page when Configure Driver clicked', () => {
      const driver = createMockDriver({ mac: 'AA:BB:CC:DD:EE:FF' });
      render(<DriverCard driver={driver} />);

      fireEvent.click(screen.getByText('Configure Driver'));

      expect(mockNavigate).toHaveBeenCalledWith('/drivers/AA:BB:CC:DD:EE:FF/config');
    });

    it('renders Open driver log button', () => {
      const driver = createMockDriver();
      render(<DriverCard driver={driver} />);

      expect(screen.getByText('Open driver log')).toBeDefined();
    });

    it('opens driver log when button clicked', () => {
      const driver = createMockDriver({ id: 'log-driver-id' });
      render(<DriverCard driver={driver} />);

      fireEvent.click(screen.getByText('Open driver log'));

      expect(mockOpenDriverLog).toHaveBeenCalledWith('log-driver-id');
    });

    it('renders action buttons', () => {
      const driver = createMockDriver();
      render(<DriverCard driver={driver} />);

      expect(screen.getByTestId('disable-driver-button')).toBeDefined();
      expect(screen.getByTestId('restart-driver-button')).toBeDefined();
      expect(screen.getByTestId('reset-driver-button')).toBeDefined();
      expect(screen.getByTestId('delete-driver-button')).toBeDefined();
    });
  });

  describe('content sections', () => {
    it('shows LED Hardware section', () => {
      const driver = createMockDriver();
      render(<DriverCard driver={driver} />);

      expect(screen.getByText('LED Hardware')).toBeDefined();
    });

    it('shows warning when no LED hardware configured', () => {
      const driver = createMockDriver({ resolvedHardware: undefined });
      render(<DriverCard driver={driver} />);

      expect(screen.getByText(/No LED hardware configured/)).toBeDefined();
    });

    it('shows LED Configuration section', () => {
      const driver = createMockDriver();
      render(<DriverCard driver={driver} />);

      expect(screen.getByText('LED Configuration')).toBeDefined();
    });

    it('shows message when no ledConfig', () => {
      const driver = createMockDriver({ ledConfig: undefined });
      render(<DriverCard driver={driver} />);

      expect(screen.getByText(/Configuration will be displayed when LED hardware/)).toBeDefined();
    });

    it('shows Driver Status section', () => {
      const driver = createMockDriver();
      render(<DriverCard driver={driver} />);

      expect(screen.getByText('Driver Status')).toBeDefined();
    });

    it('shows Driver Hardware section', () => {
      const driver = createMockDriver();
      render(<DriverCard driver={driver} />);

      expect(screen.getByText('Driver Hardware')).toBeDefined();
    });

    it('shows message when no telemetry in Driver Hardware section', () => {
      // lodash merge ignores undefined, so delete telemetry after creation
      const driver = createMockDriver();
      delete (driver as { telemetry?: unknown }).telemetry;
      render(<DriverCard driver={driver} />);

      expect(screen.getByText(/Hardware details will be displayed/)).toBeDefined();
    });

    it('shows message when no telemetry in Driver Telemetry section', () => {
      // lodash merge ignores undefined, so delete telemetry after creation
      const driver = createMockDriver();
      delete (driver as { telemetry?: unknown }).telemetry;
      render(<DriverCard driver={driver} />);

      expect(screen.getByText(/No telemetry data received/)).toBeDefined();
    });

    it('shows Driver Telemetry section', () => {
      const driver = createMockDriver();
      render(<DriverCard driver={driver} />);

      expect(screen.getByText('Driver Telemetry')).toBeDefined();
    });
  });

  describe('telemetry charts', () => {
    it('renders TelemetryCharts when driver is connected', () => {
      const driver = createMockDriver({ state: 'connected' });
      render(<DriverCard driver={driver} />);

      expect(screen.getByTestId('telemetry-charts')).toBeDefined();
    });

    it('does not render TelemetryCharts when driver is disconnected', () => {
      const driver = createMockDriver({ state: 'disconnected' });
      render(<DriverCard driver={driver} />);

      expect(screen.queryByTestId('telemetry-charts')).toBeNull();
    });
  });

  describe('interval updates', () => {
    it('renders with connected driver and telemetry', () => {
      const driver = createMockDriver({
        id: 'interval-test-driver',
        state: 'connected',
        telemetry: createMockTelemetry(),
        uptimeMs: 60000,
        lastSeen: Date.now(),
      });
      render(<DriverCard driver={driver} />);

      // Verify component renders correctly with telemetry data
      expect(screen.getByText('interval-test-driver')).toBeDefined();
      expect(screen.getByTestId('telemetry-charts')).toBeDefined();
    });
  });
});
