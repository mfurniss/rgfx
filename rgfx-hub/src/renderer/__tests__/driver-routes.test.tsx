import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SidebarNav } from '../components/layout/sidebar-nav.js';
import DriverCard from '../components/driver/driver-card.js';
import DriverListTable from '../components/driver/driver-list-table.js';
import type { Driver } from '@/types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../store/driver-store', () => ({
  useDriverStore: vi.fn((selector) => {
    const state = {
      drivers: [createMockDriver()],
      systemStatus: { currentFirmwareVersion: '1.0.0' },
    };
    return selector(state);
  }),
}));

vi.mock('../store/ui-store', () => ({
  useUiStore: vi.fn((selector) => {
    const state = {
      driverTableSortField: 'id',
      driverTableSortOrder: 'asc',
      setDriverTableSort: vi.fn(),
      tableSortPreferences: {},
      setTableSort: vi.fn(),
    };
    return selector(state);
  }),
}));

const createMockDriver = (overrides: Partial<Driver> = {}): Driver => ({
  id: 'test-driver',
  mac: 'AA:BB:CC:DD:EE:FF',
  state: 'connected',
  lastSeen: Date.now(),
  failedHeartbeats: 0,
  ip: '192.168.1.50',
  disabled: false,
  stats: {
    telemetryEventsReceived: 0,
    mqttMessagesReceived: 0,
    mqttMessagesFailed: 0,
  },
  ...overrides,
});

// Helper to check if element has class
const hasClass = (element: HTMLElement, className: string): boolean => {
  return element.className.includes(className);
};

const renderSidebarWithRoute = (initialPath: string) => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="*" element={<SidebarNav />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('Driver Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Sidebar active state highlighting', () => {
    it('highlights Drivers menu when on /drivers list page', () => {
      renderSidebarWithRoute('/drivers');

      const driversButton = screen.getByRole('button', { name: /drivers/i });
      expect(hasClass(driversButton, 'Mui-selected')).toBe(true);
    });

    it('highlights Drivers menu when on /drivers/:mac detail page', () => {
      renderSidebarWithRoute('/drivers/AA:BB:CC:DD:EE:FF');

      const driversButton = screen.getByRole('button', { name: /drivers/i });
      expect(hasClass(driversButton, 'Mui-selected')).toBe(true);
    });

    it('highlights Drivers menu when on /drivers/:mac/config page', () => {
      renderSidebarWithRoute('/drivers/AA:BB:CC:DD:EE:FF/config');

      const driversButton = screen.getByRole('button', { name: /drivers/i });
      expect(hasClass(driversButton, 'Mui-selected')).toBe(true);
    });

    it('does not highlight Drivers menu when on System Status page', () => {
      renderSidebarWithRoute('/');

      const driversButton = screen.getByRole('button', { name: /drivers/i });
      const systemStatusButton = screen.getByRole('button', { name: /system status/i });

      expect(hasClass(driversButton, 'Mui-selected')).toBe(false);
      expect(hasClass(systemStatusButton, 'Mui-selected')).toBe(true);
    });

    it('does not highlight Drivers menu when on other pages', () => {
      renderSidebarWithRoute('/games');

      const driversButton = screen.getByRole('button', { name: /drivers/i });
      const gamesButton = screen.getByRole('button', { name: /games/i });

      expect(hasClass(driversButton, 'Mui-selected')).toBe(false);
      expect(hasClass(gamesButton, 'Mui-selected')).toBe(true);
    });
  });

  describe('Navigation from Drivers menu', () => {
    it('navigates to /drivers when Drivers menu item is clicked', () => {
      renderSidebarWithRoute('/');

      const driversButton = screen.getByRole('button', { name: /drivers/i });
      fireEvent.click(driversButton);

      expect(mockNavigate).toHaveBeenCalledWith('/drivers');
    });
  });
});

describe('Driver Card back button navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('back button navigates to /drivers from driver detail page', () => {
    const driver = createMockDriver();

    render(
      <MemoryRouter initialEntries={[`/drivers/${driver.mac}`]}>
        <DriverCard driver={driver} />
      </MemoryRouter>,
    );

    const backButton = screen.getByRole('button', { name: /back to drivers/i });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/drivers');
  });

  it('configure button navigates to /drivers/:mac/config', () => {
    const driver = createMockDriver();

    render(
      <MemoryRouter initialEntries={[`/drivers/${driver.mac}`]}>
        <DriverCard driver={driver} />
      </MemoryRouter>,
    );

    const configureButton = screen.getByRole('button', { name: /configure driver/i });
    fireEvent.click(configureButton);

    expect(mockNavigate).toHaveBeenCalledWith(`/drivers/${driver.mac}/config`);
  });
});

describe('Driver List Table navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('row click navigates to /drivers/:mac', () => {
    const driver = createMockDriver();

    render(
      <MemoryRouter>
        <DriverListTable drivers={[driver]} />
      </MemoryRouter>,
    );

    const row = screen.getByRole('row', { name: /test-driver/i });
    fireEvent.click(row);

    expect(mockNavigate).toHaveBeenCalledWith(`/drivers/${driver.mac}`);
  });
});
