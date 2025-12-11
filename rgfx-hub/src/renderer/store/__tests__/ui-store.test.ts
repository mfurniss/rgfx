/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '../ui-store';
import { effectSchemas } from '@/schemas';
import { DEFAULT_FX_PLAYGROUND_EFFECT } from '@/config/constants';

describe('useUiStore', () => {
  beforeEach(() => {
    // Reset to default state between tests
    useUiStore.setState({
      driverTableSortField: 'id',
      driverTableSortOrder: 'asc',
      testEffectsSelectedEffect: DEFAULT_FX_PLAYGROUND_EFFECT,
      testEffectsPropsJson: JSON.stringify(
        effectSchemas[DEFAULT_FX_PLAYGROUND_EFFECT].parse({}), null, 2,
      ),
      testEffectsSelectedDrivers: [],
      testEffectsSelectAll: false,
      simulatorRows: Array.from({ length: 6 }, () => ({
        eventLine: '',
        autoInterval: 'off' as const,
      })),
    });
  });

  describe('initial state', () => {
    it('should have default driver table sort', () => {
      const { driverTableSortField, driverTableSortOrder } = useUiStore.getState();
      expect(driverTableSortField).toBe('id');
      expect(driverTableSortOrder).toBe('asc');
    });

    it('should have default test effects state', () => {
      const { testEffectsSelectedEffect, testEffectsSelectedDrivers, testEffectsSelectAll } =
        useUiStore.getState();
      expect(testEffectsSelectedEffect).toBe(DEFAULT_FX_PLAYGROUND_EFFECT);
      expect(testEffectsSelectedDrivers).toEqual([]);
      expect(testEffectsSelectAll).toBe(false);
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

  describe('setDriverTableSort', () => {
    it('should update sort field and order', () => {
      const { setDriverTableSort } = useUiStore.getState();

      setDriverTableSort('name', 'desc');

      const { driverTableSortField, driverTableSortOrder } = useUiStore.getState();
      expect(driverTableSortField).toBe('name');
      expect(driverTableSortOrder).toBe('desc');
    });

    it('should accept all valid sort fields', () => {
      const { setDriverTableSort } = useUiStore.getState();
      const fields = ['id', 'name', 'ip', 'status'] as const;

      for (const field of fields) {
        setDriverTableSort(field, 'asc');
        expect(useUiStore.getState().driverTableSortField).toBe(field);
      }
    });
  });

  describe('setTestEffectsState', () => {
    it('should update test effects configuration', () => {
      const { setTestEffectsState } = useUiStore.getState();
      const selectedDrivers = new Set(['driver-1', 'driver-2']);

      setTestEffectsState('wipe', '{"direction": "left"}', selectedDrivers, true);

      const state = useUiStore.getState();
      expect(state.testEffectsSelectedEffect).toBe('wipe');
      expect(state.testEffectsPropsJson).toBe('{"direction": "left"}');
      expect(state.testEffectsSelectedDrivers).toEqual(['driver-1', 'driver-2']);
      expect(state.testEffectsSelectAll).toBe(true);
    });

    it('should convert Set to array for selectedDrivers', () => {
      const { setTestEffectsState } = useUiStore.getState();
      const selectedDrivers = new Set(['a', 'b', 'c']);

      setTestEffectsState('pulse', '{}', selectedDrivers, false);

      const { testEffectsSelectedDrivers } = useUiStore.getState();
      expect(Array.isArray(testEffectsSelectedDrivers)).toBe(true);
      expect(testEffectsSelectedDrivers).toHaveLength(3);
    });

    it('should handle empty set', () => {
      const { setTestEffectsState } = useUiStore.getState();

      setTestEffectsState('explode', '{}', new Set(), false);

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
});
