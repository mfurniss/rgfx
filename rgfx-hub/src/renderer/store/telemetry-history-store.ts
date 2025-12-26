/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { create } from 'zustand';
import { RingBuffer } from '../utils/ring-buffer';
import { TELEMETRY_HISTORY_MAX_POINTS } from '@/config/constants';

/**
 * A single telemetry data point for charting.
 */
export interface TelemetryDataPoint {
  timestamp: number;
  freeHeap: number;
  heapSize: number;
  maxAllocHeap: number;
  fps: number;
  minFps: number;
  maxFps: number;
  rssi: number;
}

interface TelemetryHistoryState {
  histories: Map<string, RingBuffer<TelemetryDataPoint>>;

  /**
   * Add a telemetry data point for a driver.
   * Creates a new history buffer if this is the first data point for the driver.
   */
  addDataPoint: (driverId: string, dataPoint: TelemetryDataPoint) => void;

  /**
   * Get all telemetry data points for a driver in chronological order.
   * Returns an empty array if no history exists for the driver.
   */
  getHistory: (driverId: string) => TelemetryDataPoint[];

  /**
   * Clear telemetry history for a specific driver.
   */
  clearHistory: (driverId: string) => void;

  /**
   * Clear all telemetry history.
   */
  clearAllHistory: () => void;
}

export const useTelemetryHistoryStore = create<TelemetryHistoryState>()((set, get) => ({
  histories: new Map(),

  addDataPoint: (driverId, dataPoint) => {
    const { histories } = get();
    let buffer = histories.get(driverId);

    if (!buffer) {
      buffer = new RingBuffer<TelemetryDataPoint>(TELEMETRY_HISTORY_MAX_POINTS);
      histories.set(driverId, buffer);
    }

    buffer.push(dataPoint);

    // Trigger re-render by creating new Map reference
    set({ histories: new Map(histories) });
  },

  getHistory: (driverId) => {
    const buffer = get().histories.get(driverId);
    return buffer ? buffer.toArray() : [];
  },

  clearHistory: (driverId) => {
    const { histories } = get();
    const buffer = histories.get(driverId);

    if (buffer) {
      buffer.clear();
      set({ histories: new Map(histories) });
    }
  },

  clearAllHistory: () => {
    set({ histories: new Map() });
  },
}));
