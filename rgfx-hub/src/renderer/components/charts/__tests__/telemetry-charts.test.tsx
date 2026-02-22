import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import TelemetryCharts from '../telemetry-charts';
import { useTelemetryHistoryStore, type TelemetryDataPoint } from '@/renderer/store/telemetry-history-store';

// ResizeObserver and getComputedStyle are provided by the global test setup

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
    it('shows all charts when at least 2 data points exist', () => {
      useTelemetryHistoryStore.getState().addDataPoint('driver-1', createDataPoint(1000));
      useTelemetryHistoryStore.getState().addDataPoint('driver-1', createDataPoint(2000));

      render(<TelemetryCharts driverId="driver-1" />);

      expect(screen.getByText('Telemetry History')).toBeDefined();
      expect(screen.getByText('Frame Rate (FPS)')).toBeDefined();
      expect(screen.getByText('Memory Used')).toBeDefined();
      expect(screen.getByText('Heap Fragmentation')).toBeDefined();
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

  describe('fragmentation calculation', () => {
    it('handles maxAllocHeap greater than freeHeap without negative values', () => {
      // This can happen due to timing differences in ESP32 readings
      useTelemetryHistoryStore.getState().addDataPoint(
        'driver-1',
        createDataPoint(1000, { freeHeap: 100000, maxAllocHeap: 150000 }),
      );
      useTelemetryHistoryStore.getState().addDataPoint(
        'driver-1',
        createDataPoint(2000, { freeHeap: 100000, maxAllocHeap: 150000 }),
      );

      // Should render without errors - fragmentation clamped to 0
      const { container } = render(<TelemetryCharts driverId="driver-1" />);

      expect(container.firstChild).not.toBeNull();
      expect(screen.getByText('Heap Fragmentation')).toBeDefined();
    });

    it('handles zero freeHeap without division by zero', () => {
      useTelemetryHistoryStore.getState().addDataPoint(
        'driver-1',
        createDataPoint(1000, { freeHeap: 0, maxAllocHeap: 0 }),
      );
      useTelemetryHistoryStore.getState().addDataPoint(
        'driver-1',
        createDataPoint(2000, { freeHeap: 0, maxAllocHeap: 0 }),
      );

      // Should render without errors - fragmentation should be 0
      const { container } = render(<TelemetryCharts driverId="driver-1" />);

      expect(container.firstChild).not.toBeNull();
      expect(screen.getByText('Heap Fragmentation')).toBeDefined();
    });
  });
});
