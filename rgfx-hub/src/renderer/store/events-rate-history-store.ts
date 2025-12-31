/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { create } from 'zustand';
import { RingBuffer } from '../utils/ring-buffer';
import {
  EVENTS_RATE_SAMPLE_INTERVAL_MS,
  EVENTS_RATE_MAX_POINTS,
} from '@/config/constants';
import type { UdpStats } from '@/types';

/**
 * Cumulative UDP stats for a driver.
 */
interface DriverStatsSnapshot {
  udpSent: number;
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
   * Update stats from SystemStatus UDP stats by driver.
   */
  updateFromStatus: (
    udpStatsByDriver: Record<string, UdpStats>,
    connectedDriverIds: string[],
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

export const useEventsRateHistoryStore = create<EventsRateHistoryState>()((set, get) => ({
  history: new RingBuffer<EventsRateDataPoint>(EVENTS_RATE_MAX_POINTS),
  currentStats: new Map(),
  previousStats: new Map(),
  knownDrivers: new Set(),
  version: 0,

  updateFromStatus: (udpStatsByDriver, connectedDriverIds) => {
    const { currentStats, knownDrivers } = get();
    const connectedSet = new Set(connectedDriverIds);
    let driversChanged = false;

    // Update stats for all drivers we have UDP data for
    for (const [driverId, stats] of Object.entries(udpStatsByDriver)) {
      currentStats.set(driverId, {
        udpSent: stats.sent,
        isConnected: connectedSet.has(driverId),
      });

      if (!knownDrivers.has(driverId)) {
        driversChanged = true;
      }
    }

    // Also track connected drivers even if no UDP stats yet
    for (const driverId of connectedDriverIds) {
      if (!currentStats.has(driverId)) {
        currentStats.set(driverId, {
          udpSent: 0,
          isConnected: true,
        });

        if (!knownDrivers.has(driverId)) {
          driversChanged = true;
        }
      }
    }

    if (driversChanged) {
      const newKnownDrivers = new Set([
        ...Object.keys(udpStatsByDriver),
        ...connectedDriverIds,
      ]);
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
        // Calculate rate from UDP sent delta
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
}));

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
