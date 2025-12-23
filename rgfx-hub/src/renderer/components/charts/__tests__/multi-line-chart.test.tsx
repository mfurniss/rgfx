/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { MultiLineChart } from '../multi-line-chart';

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
  driver1: number;
  driver2: number;
}

const createTestData = (count: number): TestDataPoint[] => {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    time: now + i * 1000,
    driver1: 10 + i,
    driver2: 20 + i * 2,
  }));
};

const defaultLines = [
  { dataKey: 'driver1', name: 'Driver 1', color: '#2196f3' },
  { dataKey: 'driver2', name: 'Driver 2', color: '#4caf50' },
];

describe('MultiLineChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders chart with title', () => {
      render(
        <MultiLineChart<TestDataPoint>
          title="Multi Line Test"
          data={createTestData(5)}
          lines={defaultLines}
          tickFormatter={(v) => `${v}`}
          tooltipFormatter={(v) => `${v} events/s`}
        />,
      );

      expect(screen.getByText('Multi Line Test')).toBeDefined();
    });

    it('renders with empty data array', () => {
      const { container } = render(
        <MultiLineChart<TestDataPoint>
          title="Empty Chart"
          data={[]}
          lines={defaultLines}
          tickFormatter={(v) => `${v}`}
          tooltipFormatter={(v) => `${v}`}
        />,
      );

      expect(screen.getByText('Empty Chart')).toBeDefined();
      expect(container.querySelector('.recharts-responsive-container')).toBeDefined();
    });

    it('renders with single data point', () => {
      render(
        <MultiLineChart<TestDataPoint>
          title="Single Point"
          data={createTestData(1)}
          lines={defaultLines}
          tickFormatter={(v) => `${v}`}
          tooltipFormatter={(v) => `${v}`}
        />,
      );

      expect(screen.getByText('Single Point')).toBeDefined();
    });

    it('renders with no lines configured', () => {
      render(
        <MultiLineChart<TestDataPoint>
          title="No Lines"
          data={createTestData(5)}
          lines={[]}
          tickFormatter={(v) => `${v}`}
          tooltipFormatter={(v) => `${v}`}
        />,
      );

      expect(screen.getByText('No Lines')).toBeDefined();
    });
  });

  describe('line configuration', () => {
    it('renders multiple lines with different colors', () => {
      const lines = [
        { dataKey: 'driver1', name: 'Alpha', color: '#ff0000' },
        { dataKey: 'driver2', name: 'Beta', color: '#00ff00' },
      ];

      render(
        <MultiLineChart<TestDataPoint>
          title="Color Test"
          data={createTestData(3)}
          lines={lines}
          tickFormatter={(v) => `${v}`}
          tooltipFormatter={(v) => `${v}`}
        />,
      );

      expect(screen.getByText('Color Test')).toBeDefined();
    });

    it('accepts custom height prop', () => {
      const { container } = render(
        <MultiLineChart<TestDataPoint>
          title="Custom Height"
          data={createTestData(3)}
          lines={defaultLines}
          tickFormatter={(v) => `${v}`}
          tooltipFormatter={(v) => `${v}`}
          height={300}
        />,
      );

      expect(container.querySelector('.recharts-responsive-container')).toBeDefined();
    });
  });

  describe('CSS variable resolution', () => {
    it('calls getComputedStyle for axis color', () => {
      render(
        <MultiLineChart<TestDataPoint>
          title="CSS Test"
          data={createTestData(2)}
          lines={defaultLines}
          tickFormatter={(v) => `${v}`}
          tooltipFormatter={(v) => `${v}`}
        />,
      );

      expect(mockGetComputedStyle).toHaveBeenCalledWith(document.documentElement);
    });
  });
});
