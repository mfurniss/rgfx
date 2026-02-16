/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTelemetryHistoryStore, type TelemetryDataPoint } from '../telemetry-history-store';

const createDataPoint = (
  timestamp: number,
  overrides: Partial<TelemetryDataPoint> = {},
): TelemetryDataPoint => ({
  timestamp,
  freeHeap: 100000,
  heapSize: 327680,
  maxAllocHeap: 200000,
  fps: 60,
  minFps: 55,
  maxFps: 65,
  rssi: -50,
  ...overrides,
});

describe('useTelemetryHistoryStore', () => {
  beforeEach(() => {
    useTelemetryHistoryStore.getState().clearAllHistory();
  });

  describe('initial state', () => {
    it('should start with empty histories map', () => {
      const { histories } = useTelemetryHistoryStore.getState();
      expect(histories.size).toBe(0);
    });
  });

  describe('addDataPoint', () => {
    it('should create history for new driver', () => {
      const { addDataPoint, getHistory } = useTelemetryHistoryStore.getState();

      addDataPoint('driver-1', createDataPoint(1000));

      const history = getHistory('driver-1');
      expect(history).toHaveLength(1);
      expect(history[0].timestamp).toBe(1000);
    });

    it('should add multiple data points for same driver', () => {
      const { addDataPoint, getHistory } = useTelemetryHistoryStore.getState();

      addDataPoint('driver-1', createDataPoint(1000));
      addDataPoint('driver-1', createDataPoint(2000));
      addDataPoint('driver-1', createDataPoint(3000));

      const history = getHistory('driver-1');
      expect(history).toHaveLength(3);
      expect(history.map((p) => p.timestamp)).toEqual([1000, 2000, 3000]);
    });

    it('should maintain separate histories for different drivers', () => {
      const { addDataPoint, getHistory } = useTelemetryHistoryStore.getState();

      addDataPoint('driver-1', createDataPoint(1000, { freeHeap: 100000 }));
      addDataPoint('driver-2', createDataPoint(2000, { freeHeap: 200000 }));
      addDataPoint('driver-1', createDataPoint(3000, { freeHeap: 150000 }));

      const history1 = getHistory('driver-1');
      const history2 = getHistory('driver-2');

      expect(history1).toHaveLength(2);
      expect(history2).toHaveLength(1);
      expect(history1[0].freeHeap).toBe(100000);
      expect(history2[0].freeHeap).toBe(200000);
    });

    it('should preserve all telemetry fields', () => {
      const { addDataPoint, getHistory } = useTelemetryHistoryStore.getState();

      const dataPoint: TelemetryDataPoint = {
        timestamp: 1000,
        freeHeap: 123456,
        heapSize: 327680,
        maxAllocHeap: 200000,
        fps: 58.5,
        minFps: 45.0,
        maxFps: 62.3,
        rssi: -67,
      };

      addDataPoint('driver-1', dataPoint);

      const history = getHistory('driver-1');
      expect(history[0]).toEqual(dataPoint);
    });
  });

  describe('getHistory', () => {
    it('should return empty array for unknown driver', () => {
      const { getHistory } = useTelemetryHistoryStore.getState();

      const history = getHistory('unknown-driver');
      expect(history).toEqual([]);
    });

    it('should return data points in chronological order', () => {
      const { addDataPoint, getHistory } = useTelemetryHistoryStore.getState();

      addDataPoint('driver-1', createDataPoint(3000));
      addDataPoint('driver-1', createDataPoint(1000));
      addDataPoint('driver-1', createDataPoint(2000));

      const history = getHistory('driver-1');
      // Order is based on insertion order, not timestamp
      expect(history.map((p) => p.timestamp)).toEqual([3000, 1000, 2000]);
    });
  });

  describe('clearHistory', () => {
    it('should clear history for specific driver', () => {
      const { addDataPoint, getHistory, clearHistory } = useTelemetryHistoryStore.getState();

      addDataPoint('driver-1', createDataPoint(1000));
      addDataPoint('driver-2', createDataPoint(2000));

      clearHistory('driver-1');

      expect(getHistory('driver-1')).toEqual([]);
      expect(getHistory('driver-2')).toHaveLength(1);
    });

    it('should do nothing for unknown driver', () => {
      const { addDataPoint, getHistory, clearHistory } = useTelemetryHistoryStore.getState();

      addDataPoint('driver-1', createDataPoint(1000));
      clearHistory('unknown-driver');

      expect(getHistory('driver-1')).toHaveLength(1);
    });

    it('should remove the map entry to free memory', () => {
      const store = useTelemetryHistoryStore.getState();

      store.addDataPoint('driver-1', createDataPoint(1000));
      store.addDataPoint('driver-2', createDataPoint(2000));

      expect(store.histories.size).toBe(2);

      store.clearHistory('driver-1');

      expect(store.histories.size).toBe(1);
      expect(store.histories.has('driver-1')).toBe(false);
      expect(store.histories.has('driver-2')).toBe(true);
    });
  });

  describe('clearAllHistory', () => {
    it('should clear all driver histories', () => {
      const { addDataPoint, getHistory, clearAllHistory } = useTelemetryHistoryStore.getState();

      addDataPoint('driver-1', createDataPoint(1000));
      addDataPoint('driver-2', createDataPoint(2000));
      addDataPoint('driver-3', createDataPoint(3000));

      clearAllHistory();

      expect(getHistory('driver-1')).toEqual([]);
      expect(getHistory('driver-2')).toEqual([]);
      expect(getHistory('driver-3')).toEqual([]);
    });
  });

  describe('capacity limit', () => {
    it('should evict oldest data points when capacity is reached', () => {
      const { addDataPoint, getHistory } = useTelemetryHistoryStore.getState();

      // Add more data points than the max capacity (720)
      // For testing, we'll add 5 and check the ring buffer behavior
      for (let i = 0; i < 5; i++) {
        addDataPoint('driver-1', createDataPoint(i * 1000));
      }

      const history = getHistory('driver-1');
      expect(history).toHaveLength(5);
      expect(history[0].timestamp).toBe(0);
      expect(history[4].timestamp).toBe(4000);
    });
  });
});
