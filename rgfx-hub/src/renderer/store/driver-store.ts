import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Driver, type SystemStatus } from '../../types';
import { DRIVER_CONNECTION_TIMEOUT_MS } from '../../config/constants';

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
    (set, get) => {
      // Start connection timeout monitor
      // Checks every 5 seconds for drivers that haven't sent telemetry in >30s
      setInterval(() => {
        const now = Date.now();
        const currentDrivers = get().drivers;

        const updatedDrivers = currentDrivers.map((driver) => {
          // If driver is connected but hasn't sent telemetry within timeout window
          if (driver.connected && driver.lastSeenAt && (now - driver.lastSeenAt > DRIVER_CONNECTION_TIMEOUT_MS)) {
            // Create new Driver instance with connected=false
            return new Driver({
              id: driver.id,
              description: driver.description,
              ip: driver.ip,
              mac: driver.mac,
              hostname: driver.hostname,
              ssid: driver.ssid,
              rssi: driver.rssi,
              freeHeap: driver.freeHeap,
              minFreeHeap: driver.minFreeHeap,
              uptimeMs: driver.uptimeMs,
              lastSeen: driver.lastSeen,
              failedHeartbeats: driver.failedHeartbeats,
              lastHeartbeat: driver.lastHeartbeat,
              lastSeenAt: driver.lastSeenAt,
              telemetry: driver.telemetry,
              ledConfig: driver.ledConfig,
              resolvedHardware: driver.resolvedHardware,
              stats: driver.stats,
              updateRate: driver.updateRate,
              testActive: driver.testActive,
              connected: false,
            });
          }
          return driver;
        });

        // Check if any drivers changed state
        const hasChanges = updatedDrivers.some((driver, index) => driver.connected !== currentDrivers[index]?.connected);

        // Only update store if at least one driver changed state
        if (hasChanges) {
          set({ drivers: updatedDrivers });
        }
      }, 5000); // Check every 5 seconds

      // Note: In a browser environment, this interval will be automatically
      // cleaned up when the page unloads. In development with HMR, Zustand's
      // devtools middleware handles cleanup.

      return {
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
            const existsByMac = driver.mac
              ? state.drivers.find(
                (d) => d.mac === driver.mac && d.id !== driver.id,
              )
              : undefined;

            if (existsByMac) {
            // Driver ID changed (MAC → custom ID migration)
            // Remove old entry and add new one
              return {
                drivers: [
                  ...state.drivers.filter((d) => d.mac !== driver.mac),
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
            const existsById = state.drivers.find((d) => d.id === driver.id);

            // Check if driver exists by MAC (handles ID migration during update)
            const existsByMac = driver.mac
              ? state.drivers.find(
                (d) => d.mac === driver.mac && d.id !== driver.id,
              )
              : undefined;

            if (existsByMac) {
            // Driver ID changed - remove old entry and add new one
              return {
                drivers: [
                  ...state.drivers.filter((d) => d.mac !== driver.mac),
                  driver,
                ],
              };
            } else if (existsById) {
            // Normal update by ID
              return {
                drivers: state.drivers.map((d) => (d.id === driver.id ? driver : d)),
              };
            } else {
            // New driver - add it
              return {
                drivers: [...state.drivers, driver],
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
      };
    },
    { name: 'RGFX Driver Store' },
  ),
);
