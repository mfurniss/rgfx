import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Driver, SystemStatus } from '../../types';

interface DriverState {
  // State
  drivers: Driver[];
  systemStatus: SystemStatus;

  // Actions
  driverConnected: (driver: Driver) => void;
  driverDisconnected: (driver: Driver) => void;
  updateSystemStatus: (status: SystemStatus) => void;

  // Selectors
  connectedDrivers: () => Driver[];
}

export const useDriverStore = create<DriverState>()(
  devtools(
    persist(
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

        // Actions (match IPC behavior exactly)
        driverConnected: (driver) =>
          set((state) => {
            const exists = state.drivers.find(d => d.id === driver.id);
            return {
              drivers: exists
                ? state.drivers.map(d => d.id === driver.id ? driver : d)
                : [...state.drivers, driver]
            };
          }),

        driverDisconnected: (driver) =>
          set((state) => ({
            drivers: state.drivers.map(d => d.id === driver.id ? driver : d)
          })),

        updateSystemStatus: (status) =>
          set({ systemStatus: status }),

        // Selectors
        connectedDrivers: () => get().drivers.filter(d => d.connected),
      }),
      { name: 'rgfx-driver-storage' }
    ),
    { name: 'RGFX Driver Store' }
  )
);
