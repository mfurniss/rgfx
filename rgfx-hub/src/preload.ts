// Preload script - bridges main and renderer processes with secure IPC API
import { contextBridge, ipcRenderer } from 'electron';
import type { Driver, SystemStatus, EventTopicData } from './types';
import type { EffectPayload } from './types/transformer-types';
import type { PersistedDriverFromSchema } from './schemas';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
export const rgfxAPI = {
  onDriverConnected: (callback: (driver: Driver) => void): (() => void) => {
    console.log('[PRELOAD] Registering listener for driver:connected');
    const handler = (_event: Electron.IpcRendererEvent, driver: Driver) => {
      console.log(`[PRELOAD] IPC event received: driver:connected for ${driver.id}`);
      callback(driver);
    };
    ipcRenderer.on('driver:connected', handler);
    return () => {
      console.log('[PRELOAD] Removing listener for driver:connected');
      ipcRenderer.removeListener('driver:connected', handler);
    };
  },

  onDriverDisconnected: (callback: (driver: Driver) => void): (() => void) => {
    console.log('[PRELOAD] Registering listener for driver:disconnected');
    const handler = (_event: Electron.IpcRendererEvent, driver: Driver) => {
      console.log(`[PRELOAD] IPC event received: driver:disconnected for ${driver.id}`);
      callback(driver);
    };
    ipcRenderer.on('driver:disconnected', handler);
    return () => {
      console.log('[PRELOAD] Removing listener for driver:disconnected');
      ipcRenderer.removeListener('driver:disconnected', handler);
    };
  },

  onDriverUpdated: (callback: (driver: Driver) => void): (() => void) => {
    console.log('[PRELOAD] Registering listener for driver:updated');
    const handler = (_event: Electron.IpcRendererEvent, driver: Driver) => {
      console.log(`[PRELOAD] IPC event received: driver:updated for ${driver.id}`);
      callback(driver);
    };
    ipcRenderer.on('driver:updated', handler);
    return () => {
      console.log('[PRELOAD] Removing listener for driver:updated');
      ipcRenderer.removeListener('driver:updated', handler);
    };
  },

  onSystemStatus: (callback: (status: SystemStatus) => void): (() => void) => {
    console.log('[PRELOAD] Registering listener for system:status');
    const handler = (_event: Electron.IpcRendererEvent, status: SystemStatus) => {
      console.log(`[PRELOAD] IPC event received: system:status (mqttBroker: ${status.mqttBroker})`);
      callback(status);
    };
    ipcRenderer.on('system:status', handler);
    return () => {
      console.log('[PRELOAD] Removing listener for system:status');
      ipcRenderer.removeListener('system:status', handler);
    };
  },

  onEventCount: (callback: (count: number) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, count: number) => {
      callback(count);
    };
    ipcRenderer.on('event:count', handler);
    return () => {
      ipcRenderer.removeListener('event:count', handler);
    };
  },

  onEventTopic: (callback: (data: EventTopicData) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: EventTopicData) => {
      callback(data);
    };
    ipcRenderer.on('event:topic', handler);
    return () => {
      ipcRenderer.removeListener('event:topic', handler);
    };
  },

  onFlashOtaState: (
    callback: (data: { driverId: string; state: string }) => void,
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { driverId: string; state: string },
    ): void => {
      callback(data);
    };
    ipcRenderer.on('flash:ota:state', handler);
    return () => {
      ipcRenderer.removeListener('flash:ota:state', handler);
    };
  },

  onFlashOtaProgress: (
    callback: (progress: {
      driverId: string;
      sent: number;
      total: number;
      percent: number;
    }) => void,
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      progress: { driverId: string; sent: number; total: number; percent: number },
    ): void => {
      callback(progress);
    };
    ipcRenderer.on('flash:ota:progress', handler);
    return () => {
      ipcRenderer.removeListener('flash:ota:progress', handler);
    };
  },

  sendDriverCommand: (driverId: string, command: string, payload?: string): Promise<void> => {
    return ipcRenderer.invoke('driver:send-command', driverId, command, payload);
  },

  updateDriverConfig: (driverId: string): Promise<void> => {
    return ipcRenderer.invoke('driver:update-config', driverId);
  },

  flashOTA: (
    driverId: string,
  ): Promise<{ success: boolean; error?: string; output?: string }> => {
    return ipcRenderer.invoke('driver:flash-ota', driverId);
  },

  rendererReady: (): void => {
    ipcRenderer.send('renderer:ready');
  },

  triggerDiscovery: (): Promise<void> => {
    return ipcRenderer.invoke('discovery:trigger-immediate');
  },

  triggerEffect: (payload: EffectPayload): Promise<void> => {
    return ipcRenderer.invoke('effect:trigger', payload);
  },

  saveDriverConfig: (config: PersistedDriverFromSchema): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('driver:save-config', config);
  },

  getLEDHardwareList: (): Promise<string[]> => {
    return ipcRenderer.invoke('led-hardware:list');
  },

  openDriverLog: (driverId: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('driver:open-log', driverId);
  },

  openFile: (filePath: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('file:open', filePath);
  },

  listGames: (): Promise<{
    interceptorPath: string | null;
    interceptorName: string | null;
    transformerPath: string | null;
    transformerName: string | null;
  }[]> => {
    return ipcRenderer.invoke('games:list');
  },

  simulateEvent: (eventLine: string): Promise<void> => {
    return ipcRenderer.invoke('event:simulate', eventLine);
  },

  getDefaultPaths: (): Promise<{
    rgfxConfigDirectory: string;
    mameRomsDirectory: string;
  }> => {
    return ipcRenderer.invoke('paths:get-defaults');
  },

  selectDirectory: (title?: string, defaultPath?: string): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:select-directory', title, defaultPath);
  },

  verifyDirectory: (path: string): Promise<boolean> => {
    return ipcRenderer.invoke('fs:verify-directory', path);
  },
};

contextBridge.exposeInMainWorld('rgfx', rgfxAPI);
