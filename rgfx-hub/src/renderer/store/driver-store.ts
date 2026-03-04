import { create } from 'zustand';
import { type Driver, type DriverState as DriverStateType } from '@/types';
import { notify } from './notification-store';
import { useTelemetryHistoryStore } from './telemetry-history-store';

/**
 * Centralized notification for driver state changes.
 * Only notifies when state actually changes.
 */
function notifyStateChange(
  driverId: string,
  oldState: DriverStateType | undefined,
  newState: DriverStateType,
): void {
  // Don't notify if state unchanged
  if (oldState === newState) {
    return;
  }

  if (newState === 'connected') {
    notify(`${driverId} connected`, 'success');
  } else if (newState === 'updating') {
    notify(`${driverId} updating firmware...`, 'info');
  } else if (oldState !== 'updating' && oldState !== undefined) {
    // newState must be 'disconnected' at this point
    // Don't notify disconnect if transitioning from 'updating' (expected reboot)
    // Don't notify disconnect for drivers we haven't seen before (oldState undefined)
    notify(`${driverId} disconnected`, 'error');
  }
}

/**
 * Upsert a driver into the list, handling MAC-based ID migration.
 */
function upsertDriver(drivers: Driver[], driver: Driver): Driver[] {
  const existsById = drivers.find((d) => d.id === driver.id);
  const existsByMac = driver.mac
    ? drivers.find((d) => d.mac === driver.mac && d.id !== driver.id)
    : undefined;

  if (existsByMac) {
    // Driver ID changed (MAC → custom ID migration)
    return [...drivers.filter((d) => d.mac !== driver.mac), driver];
  } else if (existsById) {
    return drivers.map((d) => (d.id === driver.id ? driver : d));
  } else {
    return [...drivers, driver];
  }
}

interface DriverStoreState {
  // State
  drivers: Driver[];

  // Actions (callbacks prefixed with 'on')
  onDriverConnected: (driver: Driver) => void;
  onDriverDisconnected: (driver: Driver) => void;
  onDriverUpdated: (driver: Driver) => void;
  onDriverRestarting: (driver: Driver) => void;
  onDriverDeleted: (driverId: string) => void;

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

    // Actions (callbacks prefixed with 'on')
    onDriverConnected: (driver) => {
      const currentDrivers = get().drivers;
      const existingDriver = currentDrivers.find((d) => d.id === driver.id)
        ?? (driver.mac ? currentDrivers.find((d) => d.mac === driver.mac) : undefined);

      // Notify state change
      notifyStateChange(driver.id, existingDriver?.state, driver.state);

      set((state) => ({
        drivers: upsertDriver(state.drivers, driver),
      }));
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

      set((state) => ({
        drivers: upsertDriver(state.drivers, driver),
      }));
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

    // Selectors
    connectedDrivers: () => get().drivers.filter((d) => d.state === 'connected'),
    getDriverById: (id) => get().drivers.find((d) => d.id === id),
  };
});
