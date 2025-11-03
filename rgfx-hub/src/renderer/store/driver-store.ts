import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Driver, SystemStatus } from '../../types';

interface DriverState {
  // State
  drivers: Driver[];
  systemStatus: SystemStatus;

  // Actions (callbacks prefixed with 'on')
  onDriverConnected: (driver: Driver) => void;
  onDriverDisconnected: (driver: Driver) => void;
  onSystemStatusUpdate: (status: SystemStatus) => void;

  // Selectors
  connectedDrivers: () => Driver[];
  getDriverById: (id: string) => Driver | undefined;
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

        // Actions (callbacks prefixed with 'on')
        onDriverConnected: (driver) => {
          const actionStartTime = Date.now();
          console.log(`[DEBUG] onDriverConnected action called for ${driver.id} at ${actionStartTime}`);
          set((state) => {
            const exists = state.drivers.find(d => d.id === driver.id);
            console.log(`[DEBUG] onDriverConnected set() executing for ${driver.id}, exists=${!!exists} (elapsed: ${Date.now() - actionStartTime}ms)`);
            return {
              drivers: exists
                ? state.drivers.map(d => d.id === driver.id ? driver : d)
                : [...state.drivers, driver]
            };
          });
          console.log(`[DEBUG] onDriverConnected action completed for ${driver.id} (total elapsed: ${Date.now() - actionStartTime}ms)`);
        },

        onDriverDisconnected: (driver) =>
          set((state) => ({
            drivers: state.drivers.map(d => d.id === driver.id ? driver : d)
          })),

        onSystemStatusUpdate: (status) =>
          set({ systemStatus: status }),

        // Selectors
        connectedDrivers: () => get().drivers.filter(d => d.connected),
        getDriverById: (id) => get().drivers.find(d => d.id === id),
      }),
      { name: 'rgfx-driver-storage' }
    ),
    { name: 'RGFX Driver Store' }
  )
);
