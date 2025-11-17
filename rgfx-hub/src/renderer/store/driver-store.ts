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
        eventsProcessed: 0,
        hubStartTime: 0,
      },

      // Actions (callbacks prefixed with 'on')
      onDriverConnected: (driver) => {
        set((state) => {
          const existsById = state.drivers.find((d) => d.id === driver.id);

          // Check if driver exists by MAC (handles ID migration)
          const existsByMac = driver.sysInfo?.mac
            ? state.drivers.find(
                (d) => d.sysInfo?.mac === driver.sysInfo?.mac && d.id !== driver.id
              )
            : undefined;

          if (existsByMac) {
            // Driver ID changed (MAC → custom ID migration)
            // Remove old entry and add new one
            return {
              drivers: [
                ...state.drivers.filter((d) => d.sysInfo?.mac !== driver.sysInfo?.mac),
                driver,
              ],
            };
          } else if (existsById) {
            // Update existing driver
            return {
              drivers: state.drivers.map((d) => (d.id === driver.id ? driver : d)),
            };
          } else {
            // New driver
            return {
              drivers: [...state.drivers, driver],
            };
          }
        });
      },

      onDriverDisconnected: (driver) => {
        set((state) => ({
          drivers: state.drivers.map((d) => (d.id === driver.id ? driver : d)),
        }));
      },

      onDriverUpdated: (driver) => {
        set((state) => {
          // Check if driver exists by MAC (handles ID migration during update)
          const existsByMac = driver.sysInfo?.mac
            ? state.drivers.find(
                (d) => d.sysInfo?.mac === driver.sysInfo?.mac && d.id !== driver.id
              )
            : undefined;

          if (existsByMac) {
            // Driver ID changed - remove old entry and add new one
            return {
              drivers: [
                ...state.drivers.filter((d) => d.sysInfo?.mac !== driver.sysInfo?.mac),
                driver,
              ],
            };
          } else {
            // Normal update by ID
            return {
              drivers: state.drivers.map((d) => (d.id === driver.id ? { ...driver } : d)),
            };
          }
        });
      },

      onSystemStatusUpdate: (status) => {
        set({ systemStatus: status });
      },

      // Selectors
      connectedDrivers: () => get().drivers.filter((d) => d.connected),
      getDriverById: (id) => get().drivers.find((d) => d.id === id),
    }),
    { name: 'RGFX Driver Store' }
  )
);
