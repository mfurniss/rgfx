import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Driver, type SystemStatus, type DriverState as DriverStateType } from '@/types';
import { DRIVER_CONNECTION_TIMEOUT_MS, DRIVER_CONNECTION_CHECK_INTERVAL_MS } from '@/config/constants';
import { notify } from './notification-store';

/**
 * Centralized notification for driver state changes.
 * Only notifies when state actually changes.
 */
function notifyStateChange(
  driverId: string,
  oldState: DriverStateType | undefined,
  newState: DriverStateType,
): void {
  if (oldState === newState) {
    return;
  }

  if (newState === 'connected') {
    notify(`${driverId} connected`, 'success');
  } else if (newState === 'updating') {
    notify(`${driverId} updating firmware...`, 'warning');
  } else if (oldState !== 'updating') {
    // newState must be 'disconnected' at this point
    // Don't notify disconnect if transitioning from 'updating' (expected reboot)
    notify(`${driverId} disconnected`, 'error');
  }
}

interface DriverStoreState {
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

export const useDriverStore = create<DriverStoreState>()(
  devtools(
    (set, get) => {
      // Start connection timeout monitor
      // Checks every 5 seconds for drivers that haven't sent telemetry in >30s
      setInterval(() => {
        const now = Date.now();
        const currentDrivers = get().drivers;

        const updatedDrivers = currentDrivers.map((driver) => {
          // If driver is connected but hasn't sent telemetry within timeout window
          const timedOut = now - (driver.lastSeenAt ?? 0) > DRIVER_CONNECTION_TIMEOUT_MS;

          if (driver.state === 'connected' && driver.lastSeenAt && timedOut) {
            // Create new Driver instance with state='disconnected'
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
              state: 'disconnected',
            });
          }

          return driver;
        });

        // Find drivers that changed state and notify
        updatedDrivers.forEach((driver, index) => {
          const oldState = currentDrivers[index]?.state;
          notifyStateChange(driver.id, oldState, driver.state);
        });

        // Only update store if at least one driver changed state
        const hasChanges = updatedDrivers.some(
          (driver, index) => driver.state !== currentDrivers[index]?.state,
        );

        if (hasChanges) {
          set({ drivers: updatedDrivers });
        }
      }, DRIVER_CONNECTION_CHECK_INTERVAL_MS);

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
          const currentDrivers = get().drivers;
          const existingDriver = currentDrivers.find((d) => d.id === driver.id)
            ?? (driver.mac ? currentDrivers.find((d) => d.mac === driver.mac) : undefined);

          // Notify state change
          notifyStateChange(driver.id, existingDriver?.state, driver.state);

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
          const existingDriver = get().drivers.find((d) => d.id === driver.id);

          // Notify state change (notifyStateChange handles updating → disconnected suppression)
          notifyStateChange(driver.id, existingDriver?.state, driver.state);

          set((state) => ({
            drivers: state.drivers.map((d) => (d.id === driver.id ? driver : d)),
          }));
        },

        onDriverUpdated: (driver) => {
          const currentDrivers = get().drivers;
          const existingDriver = currentDrivers.find((d) => d.id === driver.id)
            ?? (driver.mac ? currentDrivers.find((d) => d.mac === driver.mac) : undefined);

          // Notify state change
          notifyStateChange(driver.id, existingDriver?.state, driver.state);

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
        connectedDrivers: () => get().drivers.filter((d) => d.state === 'connected'),
        getDriverById: (id) => get().drivers.find((d) => d.id === id),
      };
    },
    { name: 'RGFX Driver Store' },
  ),
);
