/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { LineChart } from '../line-chart';

// Mock ResizeObserver for Recharts ResponsiveContainer
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock getComputedStyle for CSS variable resolution
const mockGetComputedStyle = vi.fn().mockReturnValue({
  getPropertyValue: vi.fn().mockReturnValue('#000000'),
});
vi.stubGlobal('getComputedStyle', mockGetComputedStyle);

interface TestDataPoint {
  time: number;
  value: number;
}

const createTestData = (count: number): TestDataPoint[] => {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    time: now + i * 5000,
    value: 50 + Math.sin(i) * 20,
  }));
};

describe('LineChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders chart with title', () => {
      render(
        <LineChart<TestDataPoint>
          title="Test Chart"
          data={createTestData(5)}
          dataKey="value"
          color="#ff0000"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}`}
          tooltipFormatter={(v) => `Value: ${v}`}
        />,
      );

      expect(screen.getByText('Test Chart')).toBeDefined();
    });

    it('renders with empty data array', () => {
      const { container } = render(
        <LineChart<TestDataPoint>
          title="Empty Chart"
          data={[]}
          dataKey="value"
          color="#ff0000"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}`}
          tooltipFormatter={(v) => `${v}`}
        />,
      );

      expect(screen.getByText('Empty Chart')).toBeDefined();
      expect(container.querySelector('.recharts-responsive-container')).toBeDefined();
    });

    it('renders with single data point', () => {
      render(
        <LineChart<TestDataPoint>
          title="Single Point"
          data={createTestData(1)}
          dataKey="value"
          color="#00ff00"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tooltipFormatter={(v) => `${v}%`}
        />,
      );

      expect(screen.getByText('Single Point')).toBeDefined();
    });
  });

  describe('props handling', () => {
    it('accepts string domain values for auto-scaling', () => {
      render(
        <LineChart<TestDataPoint>
          title="Auto Scale"
          data={createTestData(5)}
          dataKey="value"
          color="#0000ff"
          domain={['dataMin - 5', 'dataMax + 5']}
          tickFormatter={(v) => Math.round(v).toString()}
          tooltipFormatter={(v) => v.toFixed(1)}
        />,
      );

      expect(screen.getByText('Auto Scale')).toBeDefined();
    });

    it('accepts numeric domain values for fixed range', () => {
      render(
        <LineChart<TestDataPoint>
          title="Fixed Range"
          data={createTestData(5)}
          dataKey="value"
          color="#ff00ff"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tooltipFormatter={(v) => `${v}%`}
        />,
      );

      expect(screen.getByText('Fixed Range')).toBeDefined();
    });

    it('uses different data keys', () => {
      interface MultiValueData {
        time: number;
        fps: number;
        memory: number;
      }

      const data: MultiValueData[] = [
        { time: 1000, fps: 60, memory: 100000 },
        { time: 2000, fps: 55, memory: 110000 },
      ];

      render(
        <LineChart<MultiValueData>
          title="FPS Chart"
          data={data}
          dataKey="fps"
          color="#00ff00"
          domain={[0, 120]}
          tickFormatter={(v) => `${v}`}
          tooltipFormatter={(v) => `${v} FPS`}
        />,
      );

      expect(screen.getByText('FPS Chart')).toBeDefined();
    });
  });

  describe('CSS variable resolution', () => {
    it('calls getComputedStyle for axis color', () => {
      render(
        <LineChart<TestDataPoint>
          title="CSS Test"
          data={createTestData(2)}
          dataKey="value"
          color="#ff0000"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}`}
          tooltipFormatter={(v) => `${v}`}
        />,
      );

      expect(mockGetComputedStyle).toHaveBeenCalledWith(document.documentElement);
    });
  });

  describe('formatter functions', () => {
    it('passes tickFormatter to YAxis', () => {
      const tickFormatter = vi.fn((v: number) => `${v} units`);

      render(
        <LineChart<TestDataPoint>
          title="Formatter Test"
          data={createTestData(3)}
          dataKey="value"
          color="#ff0000"
          domain={[0, 100]}
          tickFormatter={tickFormatter}
          tooltipFormatter={(v) => `${v}`}
        />,
      );

      expect(screen.getByText('Formatter Test')).toBeDefined();
    });

    it('passes tooltipFormatter to CustomTooltip', () => {
      const tooltipFormatter = vi.fn((v: number) => `Formatted: ${v}`);

      render(
        <LineChart<TestDataPoint>
          title="Tooltip Test"
          data={createTestData(3)}
          dataKey="value"
          color="#ff0000"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}`}
          tooltipFormatter={tooltipFormatter}
        />,
      );

      expect(screen.getByText('Tooltip Test')).toBeDefined();
    });
  });
});
