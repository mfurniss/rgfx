/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useEventsRateHistoryStore } from '../events-rate-history-store';

const createStats = (udp: number, mqtt: number) => ({
  udpMessagesSent: udp,
  mqttMessagesReceived: mqtt,
});

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

  describe('recordDriverStats', () => {
    it('should track a new driver', () => {
      const { recordDriverStats, getDriverIds } = useEventsRateHistoryStore.getState();

      recordDriverStats('driver-1', createStats(10, 5), true);

      const driverIds = getDriverIds();
      expect(driverIds).toContain('driver-1');
    });

    it('should track multiple drivers', () => {
      const { recordDriverStats, getDriverIds } = useEventsRateHistoryStore.getState();

      recordDriverStats('driver-1', createStats(10, 5), true);
      recordDriverStats('driver-2', createStats(20, 10), true);
      recordDriverStats('driver-3', createStats(30, 15), false);

      const driverIds = getDriverIds();
      expect(driverIds).toHaveLength(3);
      expect(driverIds).toEqual(['driver-1', 'driver-2', 'driver-3']);
    });
  });

  describe('sampleRates', () => {
    it('should not add data point when no drivers are known', () => {
      const { sampleRates, getHistory } = useEventsRateHistoryStore.getState();

      sampleRates();

      expect(getHistory()).toHaveLength(0);
    });

    it('should return 0 rate for first sample (no previous stats)', () => {
      const { recordDriverStats, sampleRates, getHistory } = useEventsRateHistoryStore.getState();

      recordDriverStats('driver-1', createStats(100, 50), true);
      sampleRates();

      const history = getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]['driver-1']).toBe(0);
    });

    it('should calculate rate correctly between samples using fixed interval', () => {
      const store = useEventsRateHistoryStore.getState();

      // First sample: 100 UDP + 50 MQTT = 150 total
      store.recordDriverStats('driver-1', createStats(100, 50), true);
      store.sampleRates();

      // Second sample: 200 UDP + 100 MQTT = 300 total (delta = 150)
      store.recordDriverStats('driver-1', createStats(200, 100), true);
      store.sampleRates();

      const history = store.getHistory();
      expect(history).toHaveLength(2);
      // First sample should be 0 (no previous)
      expect(history[0]['driver-1']).toBe(0);
      // Second sample: delta of 150 messages / 5 second interval = 30 events/sec
      // (EVENTS_RATE_SAMPLE_INTERVAL_MS = 5000)
      expect(history[1]['driver-1']).toBe(30);
    });

    it('should return 0 rate for disconnected driver', () => {
      const store = useEventsRateHistoryStore.getState();

      // First sample: connected with stats
      store.recordDriverStats('driver-1', createStats(100, 50), true);
      store.sampleRates();

      // Second sample: disconnected
      store.recordDriverStats('driver-1', createStats(100, 50), false);
      store.sampleRates();

      const history = store.getHistory();
      expect(history).toHaveLength(2);
      expect(history[1]['driver-1']).toBe(0);
    });

    it('should track multiple drivers independently', () => {
      const store = useEventsRateHistoryStore.getState();

      // Record stats for two drivers
      store.recordDriverStats('driver-1', createStats(100, 50), true);
      store.recordDriverStats('driver-2', createStats(200, 100), true);
      store.sampleRates();

      const history = store.getHistory();
      expect(history).toHaveLength(1);
      expect('driver-1' in history[0]).toBe(true);
      expect('driver-2' in history[0]).toBe(true);
    });
  });

  describe('getDriverIds', () => {
    it('should return sorted driver IDs', () => {
      const { recordDriverStats, getDriverIds } = useEventsRateHistoryStore.getState();

      recordDriverStats('zebra', createStats(10, 5), true);
      recordDriverStats('alpha', createStats(20, 10), true);
      recordDriverStats('beta', createStats(30, 15), true);

      const driverIds = getDriverIds();
      expect(driverIds).toEqual(['alpha', 'beta', 'zebra']);
    });
  });

  describe('clear', () => {
    it('should clear all history and stats', () => {
      const store = useEventsRateHistoryStore.getState();

      store.recordDriverStats('driver-1', createStats(100, 50), true);
      store.sampleRates();
      store.clear();

      expect(store.getHistory()).toHaveLength(0);
      expect(store.getDriverIds()).toHaveLength(0);
    });
  });

  describe('data point structure', () => {
    it('should include time property in data points', () => {
      const store = useEventsRateHistoryStore.getState();

      store.recordDriverStats('driver-1', createStats(100, 50), true);
      store.sampleRates();

      const history = store.getHistory();
      expect(history[0]).toHaveProperty('time');
      expect(typeof history[0].time).toBe('number');
    });
  });
});
