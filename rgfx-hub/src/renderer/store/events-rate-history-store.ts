/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { RingBuffer } from '../utils/ring-buffer';
import {
  EVENTS_RATE_SAMPLE_INTERVAL_MS,
  EVENTS_RATE_MAX_POINTS,
} from '@/config/constants';

/**
 * Cumulative stats for a driver (no timestamp - we use fixed sample intervals).
 * UDP stats come from SystemStatus (per-IP tracking in main process).
 */
interface DriverStatsSnapshot {
  udpSent: number;
  mqttMessagesReceived: number;
  isConnected: boolean;
}

/**
 * A single data point in the events rate history.
 * Contains timestamp and rate for each known driver.
 */
export interface EventsRateDataPoint {
  time: number;
  [driverId: string]: number;
}

interface EventsRateHistoryState {
  history: RingBuffer<EventsRateDataPoint>;
  currentStats: Map<string, DriverStatsSnapshot>;
  previousStats: Map<string, DriverStatsSnapshot>;
  knownDrivers: Set<string>;
  version: number;

  /**
   * Record cumulative stats for a driver.
   * Called when driver updates are received.
   * @param udpSent - UDP messages sent to this driver (from SystemStatus per-IP tracking)
   */
  recordDriverStats: (
    driverId: string,
    stats: { udpSent: number; mqttMessagesReceived: number },
    isConnected: boolean,
  ) => void;

  /**
   * Sample current stats and calculate rates.
   * Called by the sampling interval timer.
   */
  sampleRates: () => void;

  /**
   * Get history as array for chart rendering.
   */
  getHistory: () => EventsRateDataPoint[];

  /**
   * Get sorted list of known driver IDs.
   */
  getDriverIds: () => string[];

  /**
   * Clear all history and stats.
   */
  clear: () => void;
}

export const useEventsRateHistoryStore = create<EventsRateHistoryState>()(
  devtools(
    (set, get) => ({
      history: new RingBuffer<EventsRateDataPoint>(EVENTS_RATE_MAX_POINTS),
      currentStats: new Map(),
      previousStats: new Map(),
      knownDrivers: new Set(),
      version: 0,

      recordDriverStats: (driverId, stats, isConnected) => {
        const { currentStats, knownDrivers } = get();

        currentStats.set(driverId, {
          udpSent: stats.udpSent,
          mqttMessagesReceived: stats.mqttMessagesReceived,
          isConnected,
        });

        if (!knownDrivers.has(driverId)) {
          const newKnownDrivers = new Set(knownDrivers);
          newKnownDrivers.add(driverId);
          set({ knownDrivers: newKnownDrivers });
        }
      },

      sampleRates: () => {
        const { history, currentStats, previousStats, knownDrivers } = get();
        const now = Date.now();
        // Fixed sample interval in seconds
        const sampleIntervalSec = EVENTS_RATE_SAMPLE_INTERVAL_MS / 1000;

        const dataPoint: EventsRateDataPoint = { time: now };

        for (const driverId of knownDrivers) {
          const current = currentStats.get(driverId);
          const previous = previousStats.get(driverId);

          if (!current?.isConnected) {
            dataPoint[driverId] = 0;
            continue;
          }

          if (!previous) {
            // First sample for this driver, no rate yet
            dataPoint[driverId] = 0;
          } else {
            // Only count UDP events (actual game events sent to drivers)
            dataPoint[driverId] =
              (current.udpSent - previous.udpSent) / sampleIntervalSec;
          }

          // Save current as previous for next sample
          previousStats.set(driverId, { ...current });
        }

        // Only add data point if we have at least one driver
        if (knownDrivers.size > 0) {
          history.push(dataPoint);
        }

        set((state) => ({
          version: state.version + 1,
        }));
      },

      getHistory: () => {
        return get().history.toArray();
      },

      getDriverIds: () => {
        return Array.from(get().knownDrivers).sort();
      },

      clear: () => {
        set({
          history: new RingBuffer<EventsRateDataPoint>(EVENTS_RATE_MAX_POINTS),
          currentStats: new Map(),
          previousStats: new Map(),
          knownDrivers: new Set(),
          version: 0,
        });
      },
    }),
    { name: 'RGFX Events Rate History Store' },
  ),
);

// Start the sampling interval when the store is first imported
let samplingInterval: NodeJS.Timeout | null = null;

export function startEventsRateSampling(): void {
  if (samplingInterval) {
    return;
  }

  samplingInterval = setInterval(() => {
    useEventsRateHistoryStore.getState().sampleRates();
  }, EVENTS_RATE_SAMPLE_INTERVAL_MS);
}
