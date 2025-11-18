// Global type declarations for window.rgfx IPC bridge
import type { Driver, SystemStatus } from './types';

declare global {
  interface Window {
    rgfx: {
      onDriverConnected: (callback: (driver: Driver) => void) => () => void;
      onDriverDisconnected: (callback: (driver: Driver) => void) => () => void;
      onSystemStatus: (callback: (status: SystemStatus) => void) => () => void;
      testDriverLEDs: (driverId: string, enabled: boolean) => Promise<void>;
      flashOTA: (
        driverId: string
      ) => Promise<{ success: boolean; error?: string; output?: string }>;
      rendererReady: () => void;
    };
  }
}

export {};
