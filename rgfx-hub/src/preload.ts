// Preload script - bridges main and renderer processes with secure IPC API
import { contextBridge, ipcRenderer } from 'electron';
import type { Driver, SystemStatus, EventTopicData } from './types';
import type { EffectPayload } from './types/mapping-types';

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

  sendDriverCommand: (driverId: string, command: string, payload?: string): Promise<void> => {
    return ipcRenderer.invoke('driver:send-command', driverId, command, payload);
  },

  updateDriverConfig: (driverId: string): Promise<void> => {
    return ipcRenderer.invoke('driver:update-config', driverId);
  },

  flashOTA: (
    driverId: string
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
};

contextBridge.exposeInMainWorld('rgfx', rgfxAPI);
