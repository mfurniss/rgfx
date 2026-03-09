import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FirmwarePage from '../firmware-page';
import { useDriverStore } from '../../store/driver-store';
import { useFirmwareFlashStore } from '../../store/firmware-flash-store';
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

function createUiState(overrides = {}) {
  return {
    firmwareFlashMethod: 'ota',
    firmwareDriverFlashStatus: {},
    setFirmwareFlashMethod: vi.fn(),
    setFirmwareState: vi.fn(),
    setFirmwareDriverFlashStatus: vi.fn(),
    isFlashingFirmware: false,
    setIsFlashingFirmware: vi.fn(),
    ...overrides,
  };
}

vi.mock('../../store/firmware-flash-store', () => ({
  useFirmwareFlashStore: vi.fn((selector) => selector(createUiState())),
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

const defaultDriverStoreImpl = ((selector: any) => {
  const state = { drivers: [] };
  return selector(state);
}) as any;

const defaultUiStoreImpl = ((selector: any) => {
  return selector(createUiState());
}) as any;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useDriverStore).mockImplementation(defaultDriverStoreImpl);
  vi.mocked(useFirmwareFlashStore).mockImplementation(defaultUiStoreImpl);
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
    it('shows OTA content by default (store default is ota)', () => {
      render(<FirmwarePage />);

      expect(screen.getByTestId('target-drivers-picker')).toBeDefined();
      expect(screen.queryByTestId('serial-port-selector')).toBeNull();
    });

    it('shows USB content when store flash method is usb', () => {
      vi.mocked(useFirmwareFlashStore).mockImplementation(((selector: any) => {
        return selector(createUiState({ firmwareFlashMethod: 'usb' }));
      }) as any);

      render(<FirmwarePage />);

      expect(screen.getByTestId('serial-port-selector')).toBeDefined();
      expect(screen.queryByTestId('target-drivers-picker')).toBeNull();
    });

    it('calls setFirmwareFlashMethod when switching tabs', () => {
      const setFirmwareFlashMethodMock = vi.fn();

      vi.mocked(useFirmwareFlashStore).mockImplementation(((selector: any) => {
        return selector(createUiState({
          setFirmwareFlashMethod: setFirmwareFlashMethodMock,
        }));
      }) as any);

      render(<FirmwarePage />);

      // Click USB button
      fireEvent.click(screen.getByText('USB Serial'));

      expect(setFirmwareFlashMethodMock).toHaveBeenCalledWith('usb');
    });

    it('shows Update Firmware button', () => {
      render(<FirmwarePage />);
      expect(screen.getByText('Update Firmware')).toBeDefined();
    });
  });

  describe('method descriptions', () => {
    it('shows USB description when USB selected', () => {
      vi.mocked(useFirmwareFlashStore).mockImplementation(((selector: any) => {
        return selector(createUiState({ firmwareFlashMethod: 'usb' }));
      }) as any);

      render(<FirmwarePage />);

      expect(
        screen.getByText(/Connect a new ESP32 or existing driver via USB/),
      ).toBeDefined();
    });

    it('shows OTA description when OTA selected', () => {
      render(<FirmwarePage />);

      expect(
        screen.getByText(
          /Update firmware on already-configured drivers over WiFi/,
        ),
      ).toBeDefined();
    });
  });

  describe('flash method reads from store', () => {
    it('shows OTA when store has ota', () => {
      render(<FirmwarePage />);

      expect(screen.getByTestId('target-drivers-picker')).toBeDefined();
      expect(screen.queryByTestId('serial-port-selector')).toBeNull();
    });

    it('shows USB when store has usb', () => {
      vi.mocked(useFirmwareFlashStore).mockImplementation(((selector: any) => {
        return selector(createUiState({ firmwareFlashMethod: 'usb' }));
      }) as any);

      render(<FirmwarePage />);

      expect(screen.getByTestId('serial-port-selector')).toBeDefined();
      expect(screen.queryByTestId('target-drivers-picker')).toBeNull();
    });

    it('shows OTA regardless of driver presence', () => {
      // No drivers, but store says OTA
      render(<FirmwarePage />);
      expect(screen.getByTestId('target-drivers-picker')).toBeDefined();
    });

    it('shows OTA when drivers already connected', () => {
      vi.mocked(useDriverStore).mockImplementation(((selector: any) => {
        const state = {
          drivers: [{ id: 'rgfx-driver-0001', state: 'connected' }],
        };
        return selector(state);
      }) as any);

      render(<FirmwarePage />);

      expect(screen.getByTestId('target-drivers-picker')).toBeDefined();
      expect(screen.queryByTestId('serial-port-selector')).toBeNull();
    });
  });

  describe('default flash method by driver presence', () => {
    it('sets flash method to USB when no drivers exist on mount', () => {
      const setFirmwareFlashMethodMock = vi.fn();

      vi.mocked(useFirmwareFlashStore).mockImplementation(((selector: any) => {
        return selector(createUiState({
          setFirmwareFlashMethod: setFirmwareFlashMethodMock,
        }));
      }) as any);

      vi.mocked(useDriverStore).mockImplementation(((selector: any) => {
        const state = { drivers: [] };
        return selector(state);
      }) as any);

      render(<FirmwarePage />);

      expect(setFirmwareFlashMethodMock).toHaveBeenCalledWith('usb');
    });

    it('does not override flash method when drivers exist on mount', () => {
      const setFirmwareFlashMethodMock = vi.fn();

      vi.mocked(useFirmwareFlashStore).mockImplementation(((selector: any) => {
        return selector(createUiState({
          setFirmwareFlashMethod: setFirmwareFlashMethodMock,
        }));
      }) as any);

      vi.mocked(useDriverStore).mockImplementation(((selector: any) => {
        const state = {
          drivers: [{ id: 'rgfx-driver-0001', state: 'connected' }],
        };
        return selector(state);
      }) as any);

      render(<FirmwarePage />);

      expect(setFirmwareFlashMethodMock).not.toHaveBeenCalledWith('usb');
    });
  });

  describe('error alert', () => {
    it('shows error alert when not flashing and error exists', () => {
      vi.mocked(useFlashState).mockReturnValue({
        progress: 0,
        driverFlashStatus: new Map(),
        logMessages: [],
        error: 'No connected drivers selected',
        resultModal: {
          open: false, success: false, message: '', flashMethod: null,
        },
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
      vi.mocked(useFirmwareFlashStore).mockImplementation(((selector: any) => {
        return selector(createUiState({ isFlashingFirmware: true }));
      }) as any);

      vi.mocked(useFlashState).mockReturnValue({
        progress: 0,
        driverFlashStatus: new Map(),
        logMessages: [],
        error: 'No connected drivers selected',
        resultModal: {
          open: false, success: false, message: '', flashMethod: null,
        },
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

      expect(
        screen.queryByText('No connected drivers selected'),
      ).toBeNull();
    });
  });

  describe('no infinite loop', () => {
    it('does not loop when drivers are already connected on mount', () => {
      const setFirmwareStateMock = vi.fn();
      let callCount = 0;

      vi.mocked(useFirmwareFlashStore).mockImplementation(((selector: any) => {
        return selector(createUiState({
          setFirmwareState: () => {
            callCount++;
            setFirmwareStateMock();

            if (callCount > 10) {
              throw new Error(
                'Infinite loop: setFirmwareState called too many times',
              );
            }
          },
        }));
      }) as any);

      vi.mocked(useDriverStore).mockImplementation(((selector: any) => {
        const state = {
          drivers: [{ id: 'rgfx-driver-0001', state: 'connected' }],
        };
        return selector(state);
      }) as any);

      expect(() => {
        render(<FirmwarePage />);
      }).not.toThrow();

      expect(callCount).toBeLessThanOrEqual(5);
    });

    it('does not loop when drivers arrive after mount', () => {
      let callCount = 0;

      const setFirmwareStateMock = vi.fn(() => {
        callCount++;
      });

      vi.mocked(useFirmwareFlashStore).mockImplementation(((selector: any) => {
        return selector(createUiState({
          setFirmwareState: setFirmwareStateMock,
        }));
      }) as any);

      vi.mocked(useDriverStore).mockImplementation(((selector: any) => {
        const state = { drivers: [] };
        return selector(state);
      }) as any);

      const { rerender } = render(<FirmwarePage />);
      const initialCallCount = callCount;

      // Simulate drivers arriving
      vi.mocked(useDriverStore).mockImplementation(((selector: any) => {
        const state = {
          drivers: [{ id: 'rgfx-driver-0001', state: 'connected' }],
        };
        return selector(state);
      }) as any);

      act(() => {
        rerender(<FirmwarePage />);
      });

      const additionalCalls = callCount - initialCallCount;
      expect(additionalCalls).toBeLessThanOrEqual(3);
    });
  });
});
