/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useEventsRateHistoryStore } from '../events-rate-history-store';
import type { UdpStats } from '@/types';

const createUdpStats = (drivers: Record<string, number>): Record<string, UdpStats> => {
  const result: Record<string, UdpStats> = {};

  for (const [id, sent] of Object.entries(drivers)) {
    result[id] = { sent, failed: 0 };
  }

  return result;
};

describe('useEventsRateHistoryStore', () => {
  beforeEach(() => {
    useEventsRateHistoryStore.getState().clear();
  });

  describe('initial state', () => {
    it('should start with empty history', () => {
      const history = useEventsRateHistoryStore.getState().getHistory();
      expect(history).toHaveLength(0);
    });

    it('should start with no known drivers', () => {
      const driverIds = useEventsRateHistoryStore.getState().getDriverIds();
      expect(driverIds).toHaveLength(0);
    });
  });

  describe('updateFromStatus', () => {
    it('should track a new driver from UDP stats', () => {
      const { updateFromStatus, getDriverIds } = useEventsRateHistoryStore.getState();

      updateFromStatus(createUdpStats({ 'driver-1': 10 }), ['driver-1']);

      const driverIds = getDriverIds();
      expect(driverIds).toContain('driver-1');
    });

    it('should track connected driver even without UDP stats', () => {
      const { updateFromStatus, getDriverIds } = useEventsRateHistoryStore.getState();

      updateFromStatus({}, ['driver-1']);

      const driverIds = getDriverIds();
      expect(driverIds).toContain('driver-1');
    });

    it('should track multiple drivers', () => {
      const { updateFromStatus, getDriverIds } = useEventsRateHistoryStore.getState();

      updateFromStatus(
        createUdpStats({ 'driver-1': 10, 'driver-2': 20, 'driver-3': 30 }),
        ['driver-1', 'driver-2', 'driver-3'],
      );

      const driverIds = getDriverIds();
      expect(driverIds).toHaveLength(3);
      expect(driverIds).toEqual(['driver-1', 'driver-2', 'driver-3']);
    });

    it('should evict stale drivers no longer in status data', () => {
      const { updateFromStatus, getDriverIds } = useEventsRateHistoryStore.getState();

      updateFromStatus(
        createUdpStats({ 'driver-1': 10, 'driver-2': 20, 'driver-3': 30 }),
        ['driver-1', 'driver-2', 'driver-3'],
      );
      expect(getDriverIds()).toHaveLength(3);

      // driver-2 removed (deleted or renamed)
      updateFromStatus(
        createUdpStats({ 'driver-1': 15, 'driver-3': 35 }),
        ['driver-1', 'driver-3'],
      );

      const driverIds = getDriverIds();
      expect(driverIds).toEqual(['driver-1', 'driver-3']);
      expect(driverIds).not.toContain('driver-2');
    });
  });

  describe('sampleRates', () => {
    it('should not add data point when no drivers are known', () => {
      const { sampleRates, getHistory } = useEventsRateHistoryStore.getState();

      sampleRates();

      expect(getHistory()).toHaveLength(0);
    });

    it('should return 0 rate for first sample (no previous stats)', () => {
      const { updateFromStatus, sampleRates, getHistory } = useEventsRateHistoryStore.getState();

      updateFromStatus(createUdpStats({ 'driver-1': 100 }), ['driver-1']);
      sampleRates();

      const history = getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]['driver-1']).toBe(0);
    });

    it('should calculate rate correctly between samples using fixed interval', () => {
      const store = useEventsRateHistoryStore.getState();

      // First sample: 100 UDP sent
      store.updateFromStatus(createUdpStats({ 'driver-1': 100 }), ['driver-1']);
      store.sampleRates();

      // Second sample: 200 UDP sent (delta = 100)
      store.updateFromStatus(createUdpStats({ 'driver-1': 200 }), ['driver-1']);
      store.sampleRates();

      const history = store.getHistory();
      expect(history).toHaveLength(2);
      // First sample should be 0 (no previous)
      expect(history[0]['driver-1']).toBe(0);
      // Second sample: UDP delta of 100 / 5 second interval = 20 events/sec
      // (EVENTS_RATE_SAMPLE_INTERVAL_MS = 5000)
      expect(history[1]['driver-1']).toBe(20);
    });

    it('should return 0 rate for disconnected driver', () => {
      const store = useEventsRateHistoryStore.getState();

      // First sample: connected with stats
      store.updateFromStatus(createUdpStats({ 'driver-1': 100 }), ['driver-1']);
      store.sampleRates();

      // Second sample: disconnected (not in connected list)
      store.updateFromStatus(createUdpStats({ 'driver-1': 100 }), []);
      store.sampleRates();

      const history = store.getHistory();
      expect(history).toHaveLength(2);
      expect(history[1]['driver-1']).toBe(0);
    });

    it('should track multiple drivers independently', () => {
      const store = useEventsRateHistoryStore.getState();

      store.updateFromStatus(
        createUdpStats({ 'driver-1': 100, 'driver-2': 200 }),
        ['driver-1', 'driver-2'],
      );
      store.sampleRates();

      const history = store.getHistory();
      expect(history).toHaveLength(1);
      expect('driver-1' in history[0]).toBe(true);
      expect('driver-2' in history[0]).toBe(true);
    });
  });

  describe('getDriverIds', () => {
    it('should return sorted driver IDs', () => {
      const { updateFromStatus, getDriverIds } = useEventsRateHistoryStore.getState();

      updateFromStatus(
        createUdpStats({ zebra: 10, alpha: 20, beta: 30 }),
        ['zebra', 'alpha', 'beta'],
      );

      const driverIds = getDriverIds();
      expect(driverIds).toEqual(['alpha', 'beta', 'zebra']);
    });
  });

  describe('clear', () => {
    it('should clear all history and stats', () => {
      const store = useEventsRateHistoryStore.getState();

      store.updateFromStatus(createUdpStats({ 'driver-1': 100 }), ['driver-1']);
      store.sampleRates();
      store.clear();

      expect(store.getHistory()).toHaveLength(0);
      expect(store.getDriverIds()).toHaveLength(0);
    });
  });

  describe('data point structure', () => {
    it('should include time property in data points', () => {
      const store = useEventsRateHistoryStore.getState();

      store.updateFromStatus(createUdpStats({ 'driver-1': 100 }), ['driver-1']);
      store.sampleRates();

      const history = store.getHistory();
      expect(history[0]).toHaveProperty('time');
      expect(typeof history[0].time).toBe('number');
    });
  });
});
