import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { EventsRateChart } from '../events-rate-chart';
import { useEventsRateHistoryStore } from '@/renderer/store/events-rate-history-store';

// Mock the sampling function to prevent interval from running in tests
vi.mock('@/renderer/store/events-rate-history-store', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/renderer/store/events-rate-history-store')>();
  return {
    ...original,
    startEventsRateSampling: vi.fn(),
  };
});

// ResizeObserver and getComputedStyle are provided by the global test setup

describe('EventsRateChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEventsRateHistoryStore.getState().clear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('empty state', () => {
    it('renders nothing when no drivers are known', () => {
      const { container } = render(<EventsRateChart />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('with driver data', () => {
    it('renders chart when drivers are known', () => {
      const store = useEventsRateHistoryStore.getState();
      store.updateFromStatus({ 'driver-1': { sent: 10, failed: 0 } }, ['driver-1']);
      store.sampleRates();
      store.sampleRates();

      render(<EventsRateChart />);

      expect(screen.getByText('Events Per Second')).toBeDefined();
      expect(screen.queryByText('No driver data yet')).toBeNull();
    });

    it('renders with multiple drivers', () => {
      const store = useEventsRateHistoryStore.getState();
      store.updateFromStatus(
        {
          'driver-1': { sent: 10, failed: 0 },
          'driver-2': { sent: 20, failed: 0 },
        },
        ['driver-1', 'driver-2'],
      );
      store.sampleRates();
      store.sampleRates();

      const { container } = render(<EventsRateChart />);

      expect(screen.getByText('Events Per Second')).toBeDefined();
      expect(container.querySelector('.recharts-responsive-container')).toBeDefined();
    });
  });
});
