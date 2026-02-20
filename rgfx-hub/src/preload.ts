// Preload script - bridges main and renderer processes with secure IPC API
import { contextBridge, ipcRenderer } from 'electron';
import { exposeElectronTRPC } from 'electron-trpc/main';
import type { Driver, SystemStatus, AppInfo, DisconnectReason, LEDHardware } from './types';
import type { EffectPayload, GifBitmapResult } from './types/transformer-types';
import type { LogSizes } from './log-manager';
import type { ConfiguredDriverFromSchema } from './schemas';
import { IPC, type IpcChannel } from './config/ipc-channels';

// Expose electron-trpc for type-safe IPC communication
process.once('loaded', () => {
  exposeElectronTRPC();
});

type IpcListener<T extends unknown[]> =
  (callback: (...args: T) => void) => () => void;

// Type-safe IPC listener: strips Electron event arg, returns cleanup
function onIpc<T extends unknown[]>(
  channel: IpcChannel,
): IpcListener<T> {
  return (callback) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      ...args: unknown[]
    ) => {
      callback(...(args as T));
    };
    ipcRenderer.on(channel, handler);
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  };
}

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
export const rgfxAPI = {
  getAppInfo: (): Promise<AppInfo> => {
    return ipcRenderer.invoke('app:get-info');
  },

  onDriverConnected: onIpc<[Driver]>(IPC.DRIVER_CONNECTED),
  onDriverDisconnected: onIpc<[Driver, DisconnectReason]>(IPC.DRIVER_DISCONNECTED),
  onDriverUpdated: onIpc<[Driver]>(IPC.DRIVER_UPDATED),
  onDriverRestarting: onIpc<[Driver]>(IPC.DRIVER_RESTARTING),
  onSystemStatus: onIpc<[SystemStatus]>(IPC.SYSTEM_STATUS),
  onFlashOtaState: onIpc<[{ driverId: string; state: string }]>(IPC.FLASH_OTA_STATE),
  onFlashOtaProgress: onIpc<
    [{ driverId: string; sent: number; total: number; percent: number }]
  >(IPC.FLASH_OTA_PROGRESS),
  onFlashOtaError: onIpc<[{ driverId: string; error: string }]>(IPC.FLASH_OTA_ERROR),

  sendDriverCommand: (driverId: string, command: string, payload?: string): Promise<void> => {
    return ipcRenderer.invoke('driver:send-command', driverId, command, payload);
  },

  updateDriverConfig: (driverId: string): Promise<void> => {
    return ipcRenderer.invoke('driver:update-config', driverId);
  },

  flashOTA: (driverId: string): Promise<void> => {
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

  saveDriverConfig: (
    config: ConfiguredDriverFromSchema,
  ): Promise<{ success: boolean; driverRebooted: boolean }> => {
    return ipcRenderer.invoke('driver:save-config', config);
  },

  getLEDHardwareList: (): Promise<string[]> => {
    return ipcRenderer.invoke('led-hardware:list');
  },

  getLEDHardware: (hardwareRef: string): Promise<LEDHardware | null> => {
    return ipcRenderer.invoke('led-hardware:get', hardwareRef);
  },

  openDriverLog: (driverId: string): Promise<void> => {
    return ipcRenderer.invoke('driver:open-log', driverId);
  },

  openFile: (filePath: string): Promise<void> => {
    return ipcRenderer.invoke('file:open', filePath);
  },

  listGames: (romsDirectory?: string): Promise<{
    romName: string | null;
    interceptorPath: string | null;
    interceptorName: string | null;
    transformerPath: string | null;
    transformerName: string | null;
  }[]> => {
    return ipcRenderer.invoke('games:list', romsDirectory);
  },

  simulateEvent: (eventLine: string): Promise<void> => {
    return ipcRenderer.invoke('event:simulate', eventLine);
  },

  selectDirectory: (title?: string, defaultPath?: string): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:select-directory', title, defaultPath);
  },

  verifyDirectory: (path: string): Promise<boolean> => {
    return ipcRenderer.invoke('fs:verify-directory', path);
  },

  getFirmwareManifest: (): Promise<unknown> => {
    return ipcRenderer.invoke('firmware:get-manifest');
  },

  getFirmwareFile: (filename: string): Promise<Buffer> => {
    return ipcRenderer.invoke('firmware:get-file', filename);
  },

  setDriverDisabled: (driverId: string, disabled: boolean): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('driver:set-disabled', driverId, disabled);
  },

  setDriverFallbackEnabled: (enabled: boolean): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('settings:set-driver-fallback', enabled);
  },

  onEvent: onIpc<[string, string | undefined]>(IPC.EVENT_RECEIVED),

  resetEventCounts: (): Promise<void> => {
    return ipcRenderer.invoke('event:reset');
  },

  clearTransformerState: (): Promise<void> => {
    return ipcRenderer.invoke('transformer:clear-state');
  },

  loadGif: (): Promise<GifBitmapResult | null> => {
    return ipcRenderer.invoke('dialog:load-gif');
  },

  restartDriver: (driverId: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('driver:restart', driverId);
  },

  deleteDriver: (driverId: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('driver:delete', driverId);
  },

  onDriverDeleted: onIpc<[string]>(IPC.DRIVER_DELETED),

  showInFolder: (filePath: string): Promise<void> => {
    return ipcRenderer.invoke('file:show-in-folder', filePath);
  },

  getLogSizes: (): Promise<LogSizes> => {
    return ipcRenderer.invoke('logs:get-sizes');
  },

  clearAllLogs: (): Promise<void> => {
    return ipcRenderer.invoke('logs:clear-all');
  },

  createBackup: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('backup:create');
  },

  quitApp: (): void => {
    ipcRenderer.send('app:quit');
  },
};

contextBridge.exposeInMainWorld('rgfx', rgfxAPI);
