import { create } from 'zustand';
import { type Driver, type SystemStatus, type DriverState as DriverStateType } from '@/types';
import { notify } from './notification-store';
import { useTelemetryHistoryStore } from './telemetry-history-store';
import { useEventsRateHistoryStore } from './events-rate-history-store';

/**
 * Centralized notification for driver state changes.
 * Only notifies when state actually changes.
 */
function notifyStateChange(
  driverId: string,
  oldState: DriverStateType | undefined,
  newState: DriverStateType,
): void {
  // Don't notify on initial load (oldState is undefined) or if state unchanged
  if (oldState === undefined || oldState === newState) {
    return;
  }

  if (newState === 'connected') {
    notify(`${driverId} connected`, 'success');
  } else if (newState === 'updating') {
    notify(`${driverId} updating firmware...`, 'info');
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
  onDriverRestarting: (driver: Driver) => void;
  onDriverDeleted: (driverId: string) => void;
  onSystemStatusUpdate: (status: SystemStatus) => void;

  // Selectors
  connectedDrivers: () => Driver[];
  getDriverById: (id: string) => Driver | undefined;
}

export const useDriverStore = create<DriverStoreState>()((set, get) => {
  // Connection timeout monitoring is now handled by the main process (DriverRegistry)
  // The renderer just reflects state changes received via IPC events

  return {
    // Initial state
    drivers: [],
    systemStatus: {
      mqttBroker: 'stopped',
      udpServer: 'inactive',
      eventReader: 'stopped',
      driversConnected: 0,
      driversTotal: 0,
      hubIp: 'Unknown',
      eventsProcessed: 0,
      hubStartTime: 0,
      udpMessagesSent: 0,
      udpMessagesFailed: 0,
      systemErrors: [],
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

      // Record telemetry data point for charting
      if (driver.state === 'connected' && driver.telemetry) {
        useTelemetryHistoryStore.getState().addDataPoint(driver.id, {
          timestamp: Date.now(),
          freeHeap: driver.freeHeap ?? 0,
          heapSize: driver.telemetry.heapSize,
          maxAllocHeap: driver.telemetry.maxAllocHeap,
          fps: driver.telemetry.currentFps,
          minFps: driver.telemetry.minFps,
          maxFps: driver.telemetry.maxFps,
          rssi: driver.rssi ?? -100,
        });
      }

      // Record stats for events rate chart
      // Note: UDP stats are now tracked per-IP in SystemMonitor, not per-driver
      // For now, we pass 0 for udpSent since driver.stats no longer has UDP fields
      // TODO: Consider exposing per-IP UDP stats via IPC for per-driver rate tracking
      useEventsRateHistoryStore.getState().recordDriverStats(
        driver.id,
        { udpSent: 0, mqttMessagesReceived: driver.stats.mqttMessagesReceived },
        driver.state === 'connected',
      );

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

    onDriverRestarting: (driver) => {
      // Set driver state to 'updating' to suppress disconnect notification
      // This is used when the driver is rebooting after a config save
      set((state) => ({
        drivers: state.drivers.map((d) =>
          d.id === driver.id || d.mac === driver.mac
            ? { ...d, state: 'updating' as const }
            : d,
        ),
      }));

      // Show restarting notification after a brief delay (save notification shows first)
      setTimeout(() => {
        notify(`${driver.id} restarting...`, 'info');
      }, 1000);
    },

    onDriverDeleted: (driverId) => {
      set((state) => ({
        drivers: state.drivers.filter((d) => d.id !== driverId),
      }));
      notify(`${driverId} deleted`, 'info');
    },

    onSystemStatusUpdate: (status) => {
      const currentIp = get().systemStatus.hubIp;

      // Notify on IP change (skip initial load when hubIp is 'Unknown')
      if (currentIp !== 'Unknown' && currentIp !== status.hubIp) {
        notify(`Hub IP address changed to: ${status.hubIp}`, 'info');
      }

      set({ systemStatus: status });
    },

    // Selectors
    connectedDrivers: () => get().drivers.filter((d) => d.state === 'connected'),
    getDriverById: (id) => get().drivers.find((d) => d.id === id),
  };
});
