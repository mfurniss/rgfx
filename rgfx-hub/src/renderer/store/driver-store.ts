import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Driver, SystemStatus } from '../../types';

interface DriverState {
  // State
  drivers: Driver[];
  systemStatus: SystemStatus;

  // Actions (callbacks prefixed with 'on')
  onDriverConnected: (driver: Driver) => void;
  onDriverDisconnected: (driver: Driver) => void;
  onDriverUpdated: (driver: Driver) => void;
  onSystemStatusUpdate: (status: SystemStatus) => void;

  // Selectors
  connectedDrivers: () => Driver[];
  getDriverById: (id: string) => Driver | undefined;
}

export const useDriverStore = create<DriverState>()(
  devtools(
    (set, get) => ({
      // Initial state
      drivers: [],
      systemStatus: {
        mqttBroker: 'stopped',
        udpServer: 'inactive',
        eventReader: 'stopped',
        driversConnected: 0,
        hubIp: 'Unknown',
      },

      // Actions (callbacks prefixed with 'on')
      onDriverConnected: (driver) =>
        { set((state) => {
          const exists = state.drivers.find(d => d.id === driver.id);
          return {
            drivers: exists
              ? state.drivers.map(d => d.id === driver.id ? driver : d)
              : [...state.drivers, driver]
          };
        }); },

      onDriverDisconnected: (driver) =>
        { set((state) => ({
          drivers: state.drivers.map(d => d.id === driver.id ? driver : d)
        })); },

      onDriverUpdated: (driver) =>
        { set((state) => ({
          drivers: state.drivers.map(d =>
            d.id === driver.id ? { ...driver } : d
          )
        })); },

      onSystemStatusUpdate: (status) =>
        { set({ systemStatus: status }); },

      // Selectors
      connectedDrivers: () => get().drivers.filter(d => d.connected),
      getDriverById: (id) => get().drivers.find(d => d.id === id),
    }),
    { name: 'RGFX Driver Store' }
  )
);
