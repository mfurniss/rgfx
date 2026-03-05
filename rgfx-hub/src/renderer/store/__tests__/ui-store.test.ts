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

  describe('resetAllAutoIntervals', () => {
    it('should set all rows to off', () => {
      const { setSimulatorRow, resetAllAutoIntervals } = useUiStore.getState();

      setSimulatorRow(0, 'event1', '1s');
      setSimulatorRow(2, 'event2', '5s');
      setSimulatorRow(5, 'event3', '1s');

      resetAllAutoIntervals();

      const { simulatorRows } = useUiStore.getState();
      simulatorRows.forEach((row) => {
        expect(row.autoInterval).toBe('off');
      });
    });

    it('should preserve event lines', () => {
      const { setSimulatorRow, resetAllAutoIntervals } = useUiStore.getState();

      setSimulatorRow(0, 'game/pacman/score 1000', '5s');
      setSimulatorRow(1, 'game/galaga/fire', '1s');

      resetAllAutoIntervals();

      const { simulatorRows } = useUiStore.getState();
      expect(simulatorRows[0].eventLine).toBe('game/pacman/score 1000');
      expect(simulatorRows[1].eventLine).toBe('game/galaga/fire');
    });

    it('should be a no-op when all rows are already off', () => {
      const rowsBefore = useUiStore.getState().simulatorRows;

      useUiStore.getState().resetAllAutoIntervals();

      const rowsAfter = useUiStore.getState().simulatorRows;
      rowsAfter.forEach((row, i) => {
        expect(row.autoInterval).toBe('off');
        expect(row.eventLine).toBe(rowsBefore[i].eventLine);
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
