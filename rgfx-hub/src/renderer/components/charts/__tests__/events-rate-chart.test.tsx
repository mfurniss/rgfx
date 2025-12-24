/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { EventsRateChart } from '../events-rate-chart';
import { useEventsRateHistoryStore } from '../../../store/events-rate-history-store';

// Mock the sampling function to prevent interval from running in tests
vi.mock('../../../store/events-rate-history-store', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../store/events-rate-history-store')>();
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
    it('shows "No driver data yet" when no drivers are known', () => {
      render(<EventsRateChart />);

      expect(screen.getByText('Events Per Second')).toBeDefined();
      expect(screen.getByText('No driver data yet')).toBeDefined();
    });
  });

  describe('with driver data', () => {
    it('renders chart when drivers are known', () => {
      const store = useEventsRateHistoryStore.getState();
      store.recordDriverStats('driver-1', { udpMessagesSent: 10, mqttMessagesReceived: 5 }, true);
      store.sampleRates();

      render(<EventsRateChart />);

      expect(screen.getByText('Events Per Second')).toBeDefined();
      expect(screen.queryByText('No driver data yet')).toBeNull();
    });

    it('renders with multiple drivers', () => {
      const store = useEventsRateHistoryStore.getState();
      store.recordDriverStats('driver-1', { udpMessagesSent: 10, mqttMessagesReceived: 5 }, true);
      store.recordDriverStats('driver-2', { udpMessagesSent: 20, mqttMessagesReceived: 10 }, true);
      store.sampleRates();

      const { container } = render(<EventsRateChart />);

      expect(screen.getByText('Events Per Second')).toBeDefined();
      expect(container.querySelector('.recharts-responsive-container')).toBeDefined();
    });
  });
});
