/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TelemetryCharts from '../telemetry-charts';
import { useTelemetryHistoryStore, type TelemetryDataPoint } from '../../store/telemetry-history-store';

// Mock ResizeObserver for Recharts ResponsiveContainer
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

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

describe('TelemetryCharts', () => {
  beforeEach(() => {
    useTelemetryHistoryStore.getState().clearAllHistory();
  });

  afterEach(() => {
    cleanup();
  });

  describe('with no data', () => {
    it('renders nothing when no data points exist', () => {
      const { container } = render(<TelemetryCharts driverId="driver-1" />);

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing with only one data point', () => {
      useTelemetryHistoryStore.getState().addDataPoint('driver-1', createDataPoint(1000));

      const { container } = render(<TelemetryCharts driverId="driver-1" />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('with data', () => {
    it('shows charts when at least 2 data points exist', () => {
      useTelemetryHistoryStore.getState().addDataPoint('driver-1', createDataPoint(1000));
      useTelemetryHistoryStore.getState().addDataPoint('driver-1', createDataPoint(2000));

      render(<TelemetryCharts driverId="driver-1" />);

      expect(screen.getByText('Telemetry History')).toBeDefined();
      expect(screen.getByText('Memory Used')).toBeDefined();
      expect(screen.getByText('Frame Rate (FPS)')).toBeDefined();
    });

    it('shows sample count', () => {
      useTelemetryHistoryStore.getState().addDataPoint('driver-1', createDataPoint(1000));
      useTelemetryHistoryStore.getState().addDataPoint('driver-1', createDataPoint(2000));
      useTelemetryHistoryStore.getState().addDataPoint('driver-1', createDataPoint(3000));

      render(<TelemetryCharts driverId="driver-1" />);

      expect(screen.getByText('3 samples')).toBeDefined();
    });
  });

  describe('driver isolation', () => {
    it('only shows data for the specified driver', () => {
      useTelemetryHistoryStore.getState().addDataPoint('driver-1', createDataPoint(1000));
      useTelemetryHistoryStore.getState().addDataPoint('driver-1', createDataPoint(2000));
      useTelemetryHistoryStore.getState().addDataPoint('driver-2', createDataPoint(3000));
      useTelemetryHistoryStore.getState().addDataPoint('driver-2', createDataPoint(4000));
      useTelemetryHistoryStore.getState().addDataPoint('driver-2', createDataPoint(5000));

      render(<TelemetryCharts driverId="driver-1" />);

      expect(screen.getByText('2 samples')).toBeDefined();
    });
  });
});
