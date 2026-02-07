/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '../ui-store';
import { effectPropsSchemas } from '@/schemas';
import { DEFAULT_FX_PLAYGROUND_EFFECT } from '@/config/constants';

describe('useUiStore', () => {
  beforeEach(() => {
    // Reset to default state between tests
    useUiStore.setState({
      testEffectsSelectedEffect: DEFAULT_FX_PLAYGROUND_EFFECT,
      testEffectsPropsMap: {
        [DEFAULT_FX_PLAYGROUND_EFFECT]: JSON.stringify(
          effectPropsSchemas[DEFAULT_FX_PLAYGROUND_EFFECT].parse({}), null, 2,
        ),
      },
      testEffectsSelectedDrivers: [],
      simulatorRows: Array.from({ length: 6 }, () => ({
        eventLine: '',
        autoInterval: 'off' as const,
      })),
    });
  });

  describe('initial state', () => {
    it('should have default test effects state', () => {
      const { testEffectsSelectedEffect, testEffectsSelectedDrivers } =
        useUiStore.getState();
      expect(testEffectsSelectedEffect).toBe(DEFAULT_FX_PLAYGROUND_EFFECT);
      expect(testEffectsSelectedDrivers).toEqual([]);
    });

    it('should have 6 empty simulator rows', () => {
      const { simulatorRows } = useUiStore.getState();
      expect(simulatorRows).toHaveLength(6);
      simulatorRows.forEach((row) => {
        expect(row.eventLine).toBe('');
        expect(row.autoInterval).toBe('off');
      });
    });
  });

  describe('setTestEffectsState', () => {
    it('should update test effects configuration', () => {
      const { setTestEffectsState } = useUiStore.getState();
      const selectedDrivers = new Set(['driver-1', 'driver-2']);

      setTestEffectsState('wipe', '{"direction": "left"}', selectedDrivers);

      const state = useUiStore.getState();
      expect(state.testEffectsSelectedEffect).toBe('wipe');
      expect(state.testEffectsPropsMap.wipe).toBe('{"direction": "left"}');
      expect(state.testEffectsSelectedDrivers).toEqual(['driver-1', 'driver-2']);
    });

    it('should retain props for each effect when switching', () => {
      const { setTestEffectsState } = useUiStore.getState();

      // Set props for pulse effect
      setTestEffectsState('pulse', '{"color": "red"}', new Set(['d1']));

      // Set props for wipe effect
      setTestEffectsState('wipe', '{"direction": "up"}', new Set(['d1']));

      // Both should be retained
      const state = useUiStore.getState();
      expect(state.testEffectsPropsMap.pulse).toBe('{"color": "red"}');
      expect(state.testEffectsPropsMap.wipe).toBe('{"direction": "up"}');
    });

    it('should convert Set to array for selectedDrivers', () => {
      const { setTestEffectsState } = useUiStore.getState();
      const selectedDrivers = new Set(['a', 'b', 'c']);

      setTestEffectsState('pulse', '{}', selectedDrivers);

      const { testEffectsSelectedDrivers } = useUiStore.getState();
      expect(Array.isArray(testEffectsSelectedDrivers)).toBe(true);
      expect(testEffectsSelectedDrivers).toHaveLength(3);
    });

    it('should handle empty set', () => {
      const { setTestEffectsState } = useUiStore.getState();

      setTestEffectsState('explode', '{}', new Set());

      expect(useUiStore.getState().testEffectsSelectedDrivers).toEqual([]);
    });
  });

  describe('setSimulatorRow', () => {
    it('should update specific simulator row', () => {
      const { setSimulatorRow } = useUiStore.getState();

      setSimulatorRow(0, 'game/pacman/score 1000', '1s');

      const { simulatorRows } = useUiStore.getState();
      expect(simulatorRows[0]).toEqual({
        eventLine: 'game/pacman/score 1000',
        autoInterval: '1s',
      });
    });

    it('should not affect other rows', () => {
      const { setSimulatorRow } = useUiStore.getState();

      setSimulatorRow(2, 'game/event test', '5s');

      const { simulatorRows } = useUiStore.getState();
      expect(simulatorRows[0].eventLine).toBe('');
      expect(simulatorRows[1].eventLine).toBe('');
      expect(simulatorRows[2].eventLine).toBe('game/event test');
      expect(simulatorRows[3].eventLine).toBe('');
    });

    it('should accept all valid auto intervals', () => {
      const { setSimulatorRow } = useUiStore.getState();
      const intervals = ['off', '1s', '5s'] as const;

      intervals.forEach((interval, index) => {
        setSimulatorRow(index, 'test', interval);
        expect(useUiStore.getState().simulatorRows[index].autoInterval).toBe(interval);
      });
    });

    it('should update last row (index 5)', () => {
      const { setSimulatorRow } = useUiStore.getState();

      setSimulatorRow(5, 'last row event', '1s');

      const { simulatorRows } = useUiStore.getState();
      expect(simulatorRows[5].eventLine).toBe('last row event');
    });

    it('should preserve immutability of simulatorRows array', () => {
      const rowsBefore = useUiStore.getState().simulatorRows;
      const { setSimulatorRow } = useUiStore.getState();

      setSimulatorRow(0, 'new event', 'off');

      const rowsAfter = useUiStore.getState().simulatorRows;
      expect(rowsBefore).not.toBe(rowsAfter);
    });
  });

  describe('firmware page state', () => {
    beforeEach(() => {
      // Reset firmware state
      useUiStore.setState({
        isFlashingFirmware: false,
        firmwareFlashMethod: 'ota',
        firmwareSelectedDrivers: [],
        firmwareSelectAll: false,
        firmwareDriverFlashStatus: {},
      });
    });

    describe('initial state', () => {
      it('should have default firmware state', () => {
        const state = useUiStore.getState();
        expect(state.isFlashingFirmware).toBe(false);
        expect(state.firmwareFlashMethod).toBe('ota');
        expect(state.firmwareSelectedDrivers).toEqual([]);
        expect(state.firmwareSelectAll).toBe(false);
        expect(state.firmwareDriverFlashStatus).toEqual({});
      });
    });

    describe('setIsFlashingFirmware', () => {
      it('should set flashing state to true', () => {
        const { setIsFlashingFirmware } = useUiStore.getState();

        setIsFlashingFirmware(true);

        expect(useUiStore.getState().isFlashingFirmware).toBe(true);
      });

      it('should set flashing state to false', () => {
        useUiStore.setState({ isFlashingFirmware: true });
        const { setIsFlashingFirmware } = useUiStore.getState();

        setIsFlashingFirmware(false);

        expect(useUiStore.getState().isFlashingFirmware).toBe(false);
      });
    });

    describe('setFirmwareState', () => {
      it('should update flash method', () => {
        const { setFirmwareState } = useUiStore.getState();

        setFirmwareState('usb', [], false);

        expect(useUiStore.getState().firmwareFlashMethod).toBe('usb');
      });

      it('should update selected drivers', () => {
        const { setFirmwareState } = useUiStore.getState();

        setFirmwareState('ota', ['driver-1', 'driver-2'], false);

        expect(useUiStore.getState().firmwareSelectedDrivers).toEqual(['driver-1', 'driver-2']);
      });

      it('should update select all flag', () => {
        const { setFirmwareState } = useUiStore.getState();

        setFirmwareState('ota', ['driver-1'], true);

        expect(useUiStore.getState().firmwareSelectAll).toBe(true);
      });

      it('should update all firmware state at once', () => {
        const { setFirmwareState } = useUiStore.getState();

        setFirmwareState('usb', ['d1', 'd2', 'd3'], true);

        const state = useUiStore.getState();
        expect(state.firmwareFlashMethod).toBe('usb');
        expect(state.firmwareSelectedDrivers).toEqual(['d1', 'd2', 'd3']);
        expect(state.firmwareSelectAll).toBe(true);
      });

      it('should handle empty driver selection', () => {
        const { setFirmwareState } = useUiStore.getState();

        setFirmwareState('ota', [], false);

        expect(useUiStore.getState().firmwareSelectedDrivers).toEqual([]);
      });
    });

    describe('setFirmwareDriverFlashStatus', () => {
      it('should set driver flash status', () => {
        const { setFirmwareDriverFlashStatus } = useUiStore.getState();
        const status = {
          'driver-1': { status: 'flashing' as const, progress: 50 },
          'driver-2': { status: 'pending' as const, progress: 0 },
        };

        setFirmwareDriverFlashStatus(status);

        expect(useUiStore.getState().firmwareDriverFlashStatus).toEqual(status);
      });

      it('should update status with success state', () => {
        const { setFirmwareDriverFlashStatus } = useUiStore.getState();
        const status = {
          'driver-1': { status: 'success' as const, progress: 100 },
        };

        setFirmwareDriverFlashStatus(status);

        expect(useUiStore.getState().firmwareDriverFlashStatus['driver-1'].status).toBe('success');
        expect(useUiStore.getState().firmwareDriverFlashStatus['driver-1'].progress).toBe(100);
      });

      it('should update status with error state', () => {
        const { setFirmwareDriverFlashStatus } = useUiStore.getState();
        const status = {
          'driver-1': { status: 'error' as const, progress: 0, error: 'Connection failed' },
        };

        setFirmwareDriverFlashStatus(status);

        const driverStatus = useUiStore.getState().firmwareDriverFlashStatus['driver-1'];
        expect(driverStatus.status).toBe('error');
        expect(driverStatus.error).toBe('Connection failed');
      });

      it('should clear status when set to empty object', () => {
        useUiStore.setState({
          firmwareDriverFlashStatus: {
            'driver-1': { status: 'flashing', progress: 50 },
          },
        });
        const { setFirmwareDriverFlashStatus } = useUiStore.getState();

        setFirmwareDriverFlashStatus({});

        expect(useUiStore.getState().firmwareDriverFlashStatus).toEqual({});
      });

      it('should replace entire status object', () => {
        useUiStore.setState({
          firmwareDriverFlashStatus: {
            'old-driver': { status: 'success', progress: 100 },
          },
        });
        const { setFirmwareDriverFlashStatus } = useUiStore.getState();

        setFirmwareDriverFlashStatus({
          'new-driver': { status: 'pending', progress: 0 },
        });

        const status = useUiStore.getState().firmwareDriverFlashStatus;
        expect(status['old-driver']).toBeUndefined();
        expect(status['new-driver']).toBeDefined();
      });
    });
  });

  describe('WiFi credentials persistence', () => {
    beforeEach(() => {
      useUiStore.setState({
        lastWifiSsid: '',
        lastWifiPassword: '',
      });
    });

    describe('initial state', () => {
      it('should have empty WiFi credentials by default', () => {
        const state = useUiStore.getState();
        expect(state.lastWifiSsid).toBe('');
        expect(state.lastWifiPassword).toBe('');
      });
    });

    describe('setLastWifiCredentials', () => {
      it('should update both SSID and password', () => {
        const { setLastWifiCredentials } = useUiStore.getState();

        setLastWifiCredentials('MyNetwork', 'MyPassword123');

        const state = useUiStore.getState();
        expect(state.lastWifiSsid).toBe('MyNetwork');
        expect(state.lastWifiPassword).toBe('MyPassword123');
      });

      it('should handle empty password (open network)', () => {
        const { setLastWifiCredentials } = useUiStore.getState();

        setLastWifiCredentials('OpenNetwork', '');

        const state = useUiStore.getState();
        expect(state.lastWifiSsid).toBe('OpenNetwork');
        expect(state.lastWifiPassword).toBe('');
      });

      it('should handle SSID with special characters', () => {
        const { setLastWifiCredentials } = useUiStore.getState();

        setLastWifiCredentials('My Network! @#$', 'pass word');

        const state = useUiStore.getState();
        expect(state.lastWifiSsid).toBe('My Network! @#$');
        expect(state.lastWifiPassword).toBe('pass word');
      });

      it('should overwrite previous credentials', () => {
        const { setLastWifiCredentials } = useUiStore.getState();

        setLastWifiCredentials('Network1', 'Pass1');
        setLastWifiCredentials('Network2', 'Pass2');

        const state = useUiStore.getState();
        expect(state.lastWifiSsid).toBe('Network2');
        expect(state.lastWifiPassword).toBe('Pass2');
      });
    });
  });
});
