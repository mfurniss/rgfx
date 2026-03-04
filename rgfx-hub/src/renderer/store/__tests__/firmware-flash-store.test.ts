import { describe, it, expect, beforeEach } from 'vitest';
import { useFirmwareFlashStore } from '../firmware-flash-store';

describe('useFirmwareFlashStore', () => {
  beforeEach(() => {
    useFirmwareFlashStore.setState({
      isFlashingFirmware: false,
      firmwareFlashMethod: 'ota',
      firmwareSelectedDrivers: [],
      firmwareSelectAll: false,
      firmwareDriverFlashStatus: {},
    });
  });

  describe('initial state', () => {
    it('should have default firmware state', () => {
      const state = useFirmwareFlashStore.getState();
      expect(state.isFlashingFirmware).toBe(false);
      expect(state.firmwareFlashMethod).toBe('ota');
      expect(state.firmwareSelectedDrivers).toEqual([]);
      expect(state.firmwareSelectAll).toBe(false);
      expect(state.firmwareDriverFlashStatus).toEqual({});
    });
  });

  describe('setIsFlashingFirmware', () => {
    it('should set flashing state to true', () => {
      const { setIsFlashingFirmware } = useFirmwareFlashStore.getState();

      setIsFlashingFirmware(true);

      expect(useFirmwareFlashStore.getState().isFlashingFirmware).toBe(true);
    });

    it('should set flashing state to false', () => {
      useFirmwareFlashStore.setState({ isFlashingFirmware: true });
      const { setIsFlashingFirmware } = useFirmwareFlashStore.getState();

      setIsFlashingFirmware(false);

      expect(useFirmwareFlashStore.getState().isFlashingFirmware).toBe(false);
    });
  });

  describe('setFirmwareState', () => {
    it('should update flash method', () => {
      const { setFirmwareState } = useFirmwareFlashStore.getState();

      setFirmwareState('usb', [], false);

      expect(useFirmwareFlashStore.getState().firmwareFlashMethod).toBe('usb');
    });

    it('should update selected drivers', () => {
      const { setFirmwareState } = useFirmwareFlashStore.getState();

      setFirmwareState('ota', ['driver-1', 'driver-2'], false);

      expect(useFirmwareFlashStore.getState().firmwareSelectedDrivers).toEqual(['driver-1', 'driver-2']);
    });

    it('should update select all flag', () => {
      const { setFirmwareState } = useFirmwareFlashStore.getState();

      setFirmwareState('ota', ['driver-1'], true);

      expect(useFirmwareFlashStore.getState().firmwareSelectAll).toBe(true);
    });

    it('should update all firmware state at once', () => {
      const { setFirmwareState } = useFirmwareFlashStore.getState();

      setFirmwareState('usb', ['d1', 'd2', 'd3'], true);

      const state = useFirmwareFlashStore.getState();
      expect(state.firmwareFlashMethod).toBe('usb');
      expect(state.firmwareSelectedDrivers).toEqual(['d1', 'd2', 'd3']);
      expect(state.firmwareSelectAll).toBe(true);
    });

    it('should handle empty driver selection', () => {
      const { setFirmwareState } = useFirmwareFlashStore.getState();

      setFirmwareState('ota', [], false);

      expect(useFirmwareFlashStore.getState().firmwareSelectedDrivers).toEqual([]);
    });
  });

  describe('setFirmwareDriverFlashStatus', () => {
    it('should set driver flash status', () => {
      const { setFirmwareDriverFlashStatus } = useFirmwareFlashStore.getState();
      const status = {
        'driver-1': { status: 'flashing' as const, progress: 50 },
        'driver-2': { status: 'pending' as const, progress: 0 },
      };

      setFirmwareDriverFlashStatus(status);

      expect(useFirmwareFlashStore.getState().firmwareDriverFlashStatus).toEqual(status);
    });

    it('should update status with success state', () => {
      const { setFirmwareDriverFlashStatus } = useFirmwareFlashStore.getState();
      const status = {
        'driver-1': { status: 'success' as const, progress: 100 },
      };

      setFirmwareDriverFlashStatus(status);

      expect(useFirmwareFlashStore.getState().firmwareDriverFlashStatus['driver-1'].status).toBe('success');
      expect(useFirmwareFlashStore.getState().firmwareDriverFlashStatus['driver-1'].progress).toBe(100);
    });

    it('should update status with error state', () => {
      const { setFirmwareDriverFlashStatus } = useFirmwareFlashStore.getState();
      const status = {
        'driver-1': { status: 'error' as const, progress: 0, error: 'Connection failed' },
      };

      setFirmwareDriverFlashStatus(status);

      const driverStatus = useFirmwareFlashStore.getState().firmwareDriverFlashStatus['driver-1'];
      expect(driverStatus.status).toBe('error');
      expect(driverStatus.error).toBe('Connection failed');
    });

    it('should clear status when set to empty object', () => {
      useFirmwareFlashStore.setState({
        firmwareDriverFlashStatus: {
          'driver-1': { status: 'flashing', progress: 50 },
        },
      });
      const { setFirmwareDriverFlashStatus } = useFirmwareFlashStore.getState();

      setFirmwareDriverFlashStatus({});

      expect(useFirmwareFlashStore.getState().firmwareDriverFlashStatus).toEqual({});
    });

    it('should replace entire status object', () => {
      useFirmwareFlashStore.setState({
        firmwareDriverFlashStatus: {
          'old-driver': { status: 'success', progress: 100 },
        },
      });
      const { setFirmwareDriverFlashStatus } = useFirmwareFlashStore.getState();

      setFirmwareDriverFlashStatus({
        'new-driver': { status: 'pending', progress: 0 },
      });

      const status = useFirmwareFlashStore.getState().firmwareDriverFlashStatus;
      expect(status['old-driver']).toBeUndefined();
      expect(status['new-driver']).toBeDefined();
    });
  });
});
