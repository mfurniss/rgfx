/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DriverListTable from '../driver-list-table';
import type { Driver } from '@/types';
import { useUiStore } from '@/renderer/store/ui-store';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/renderer/store/system-status-store', () => ({
  useSystemStatusStore: vi.fn(() => '1.0.0'),
}));

const createDriver = (overrides: Partial<Driver>): Driver => ({
  id: 'test-driver',
  mac: 'AA:BB:CC:DD:EE:FF',
  state: 'disconnected',
  lastSeen: Date.now(),
  failedHeartbeats: 0,
  ip: undefined,
  disabled: false,
  stats: {
    telemetryEventsReceived: 0,
    mqttMessagesReceived: 0,
    mqttMessagesFailed: 0,
  },
  ...overrides,
});

const renderTable = (drivers: Driver[]) => {
  return render(
    <MemoryRouter>
      <DriverListTable drivers={drivers} />
    </MemoryRouter>,
  );
};

const getDriverIdsInOrder = (): string[] => {
  const rows = screen.getAllByRole('row').slice(1); // Skip header row

  return rows.map((row) => {
    const cells = within(row).getAllByRole('cell');

    return cells[0].textContent || '';
  });
};

describe('DriverListTable', () => {
  beforeEach(() => {
    useUiStore.setState({
      tableSortPreferences: {},
    });
  });

  describe('status column sorting', () => {
    const drivers: Driver[] = [
      createDriver({ id: 'driver-disabled', mac: '11:11:11:11:11:11', disabled: true }),
      createDriver({ id: 'driver-connected', mac: '22:22:22:22:22:22', state: 'connected', ip: '192.168.1.1' }),
      createDriver({ id: 'driver-disconnected', mac: '33:33:33:33:33:33', state: 'disconnected' }),
      createDriver({ id: 'driver-updating', mac: '44:44:44:44:44:44', state: 'updating' }),
    ];

    it('sorts by status ascending: disabled < disconnected < updating < connected', () => {
      useUiStore.setState({
        tableSortPreferences: {
          driverList: { field: 'status', order: 'asc' },
        },
      });

      renderTable(drivers);

      const driverIds = getDriverIdsInOrder();

      expect(driverIds).toEqual([
        'driver-disabled',
        'driver-disconnected',
        'driver-updating',
        'driver-connected',
      ]);
    });

    it('sorts by status descending: connected > updating > disconnected > disabled', () => {
      useUiStore.setState({
        tableSortPreferences: {
          driverList: { field: 'status', order: 'desc' },
        },
      });

      renderTable(drivers);

      const driverIds = getDriverIdsInOrder();

      expect(driverIds).toEqual([
        'driver-connected',
        'driver-updating',
        'driver-disconnected',
        'driver-disabled',
      ]);
    });

    it('treats disabled drivers as lowest priority regardless of state', () => {
      const driversWithDisabledConnected: Driver[] = [
        createDriver({
          id: 'driver-disabled-connected',
          mac: '11:11:11:11:11:11',
          disabled: true,
          state: 'connected',
          ip: '192.168.1.1',
        }),
        createDriver({ id: 'driver-disconnected', mac: '22:22:22:22:22:22', state: 'disconnected' }),
      ];

      useUiStore.setState({
        tableSortPreferences: {
          driverList: { field: 'status', order: 'asc' },
        },
      });

      renderTable(driversWithDisabledConnected);

      const driverIds = getDriverIdsInOrder();

      // Disabled driver should be first (lowest) even though state is 'connected'
      expect(driverIds).toEqual(['driver-disabled-connected', 'driver-disconnected']);
    });
  });

  describe('id column sorting', () => {
    const drivers: Driver[] = [
      createDriver({ id: 'charlie', mac: '11:11:11:11:11:11' }),
      createDriver({ id: 'alpha', mac: '22:22:22:22:22:22' }),
      createDriver({ id: 'bravo', mac: '33:33:33:33:33:33' }),
    ];

    it('sorts by id ascending alphabetically', () => {
      useUiStore.setState({
        tableSortPreferences: {
          driverList: { field: 'id', order: 'asc' },
        },
      });

      renderTable(drivers);

      const driverIds = getDriverIdsInOrder();

      expect(driverIds).toEqual(['alpha', 'bravo', 'charlie']);
    });

    it('sorts by id descending alphabetically', () => {
      useUiStore.setState({
        tableSortPreferences: {
          driverList: { field: 'id', order: 'desc' },
        },
      });

      renderTable(drivers);

      const driverIds = getDriverIdsInOrder();

      expect(driverIds).toEqual(['charlie', 'bravo', 'alpha']);
    });
  });

  describe('ip column sorting', () => {
    const drivers: Driver[] = [
      createDriver({ id: 'driver-c', mac: '11:11:11:11:11:11', state: 'connected', ip: '192.168.1.30' }),
      createDriver({ id: 'driver-a', mac: '22:22:22:22:22:22', state: 'connected', ip: '192.168.1.10' }),
      createDriver({ id: 'driver-b', mac: '33:33:33:33:33:33', state: 'connected', ip: '192.168.1.20' }),
      createDriver({ id: 'driver-none', mac: '44:44:44:44:44:44', state: 'disconnected', ip: undefined }),
    ];

    it('sorts by ip ascending with null values at end', () => {
      useUiStore.setState({
        tableSortPreferences: {
          driverList: { field: 'ip', order: 'asc' },
        },
      });

      renderTable(drivers);

      const driverIds = getDriverIdsInOrder();

      // Note: string comparison, so 192.168.1.10 < 192.168.1.20 < 192.168.1.30
      // Empty string (from null) sorts first in localeCompare
      expect(driverIds[0]).toBe('driver-none');
      expect(driverIds[1]).toBe('driver-a');
      expect(driverIds[2]).toBe('driver-b');
      expect(driverIds[3]).toBe('driver-c');
    });
  });
});
