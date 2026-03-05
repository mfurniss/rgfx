/**
 * IPC Contract — single source of truth for all IPC channel names,
 * argument types, and return types.
 *
 * The preload bridge, Window.rgfx type, and test mock factory are all
 * derived from the definitions in this file.
 */

import type {
  AppInfo,
  Driver,
  DisconnectReason,
  SystemStatus,
  LEDHardware,
  GameInfo,
} from '../types';
import type {
  EffectPayload,
  GifBitmapResult,
} from '../types/transformer-types';
import type { LogSizes } from '../log-manager';
import type { ConfiguredDriverFromSchema } from '../schemas';

// ---------------------------------------------------------------------------
// Channel name maps (runtime)
// ---------------------------------------------------------------------------

/** Invoke channels: renderer calls main, gets a Promise response. */
export const INVOKE_CHANNELS = {
  getAppInfo: 'app:get-info',
  sendDriverCommand: 'driver:send-command',
  updateDriverConfig: 'driver:update-config',
  flashOTA: 'driver:flash-ota',
  triggerDiscovery: 'discovery:trigger-immediate',
  triggerEffect: 'effect:trigger',
  saveDriverConfig: 'driver:save-config',
  getLEDHardwareList: 'led-hardware:list',
  getLEDHardware: 'led-hardware:get',
  openDriverLog: 'driver:open-log',
  openFile: 'file:open',
  listGames: 'games:list',
  simulateEvent: 'event:simulate',
  selectDirectory: 'dialog:select-directory',
  verifyDirectory: 'fs:verify-directory',
  getFirmwareManifest: 'firmware:get-manifest',
  getFirmwareFile: 'firmware:get-file',
  setDriverDisabled: 'driver:set-disabled',
  setDriverFallbackEnabled: 'settings:set-driver-fallback',
  resetEventCounts: 'event:reset',
  clearTransformerState: 'transformer:clear-state',
  loadGif: 'dialog:load-gif',
  restartDriver: 'driver:restart',
  deleteDriver: 'driver:delete',
  showInFolder: 'file:show-in-folder',
  getLogSizes: 'logs:get-sizes',
  clearAllLogs: 'logs:clear-all',
  createBackup: 'backup:create',
  setDriverId: 'driver:set-id',
} as const;

/** Push channels: main sends to renderer via webContents.send. */
export const PUSH_CHANNELS = {
  onDriverConnected: 'driver:connected',
  onDriverDisconnected: 'driver:disconnected',
  onDriverUpdated: 'driver:updated',
  onDriverRestarting: 'driver:restarting',
  onDriverDeleted: 'driver:deleted',
  onSystemStatus: 'system:status',
  onFlashOtaState: 'flash:ota:state',
  onFlashOtaProgress: 'flash:ota:progress',
  onFlashOtaError: 'flash:ota:error',
  onEvent: 'event:received',
} as const;

/** Send channels: renderer fires to main, no response. */
export const SEND_CHANNELS = {
  rendererReady: 'renderer:ready',
  quitApp: 'app:quit',
} as const;

// ---------------------------------------------------------------------------
// Type contracts
// ---------------------------------------------------------------------------

/** Invoke method types: args tuple + return type. */
export interface InvokeContract {
  getAppInfo: {
    args: [];
    return: AppInfo;
  };
  sendDriverCommand: {
    args: [driverId: string, command: string, payload?: string];
    return: undefined;
  };
  updateDriverConfig: {
    args: [driverId: string];
    return: undefined;
  };
  flashOTA: {
    args: [driverId: string];
    return: { success: boolean; error?: string; output?: string };
  };
  triggerDiscovery: {
    args: [];
    return: undefined;
  };
  triggerEffect: {
    args: [payload: EffectPayload];
    return: undefined;
  };
  saveDriverConfig: {
    args: [config: ConfiguredDriverFromSchema];
    return: { success: boolean };
  };
  getLEDHardwareList: {
    args: [];
    return: string[];
  };
  getLEDHardware: {
    args: [hardwareRef: string];
    return: LEDHardware | null;
  };
  openDriverLog: {
    args: [driverId: string];
    return: { success: boolean; error?: string };
  };
  openFile: {
    args: [filePath: string];
    return: { success: boolean; error?: string };
  };
  listGames: {
    args: [romsDirectory?: string];
    return: GameInfo[];
  };
  simulateEvent: {
    args: [eventLine: string];
    return: undefined;
  };
  selectDirectory: {
    args: [title?: string, defaultPath?: string];
    return: string | null;
  };
  verifyDirectory: {
    args: [path: string];
    return: boolean;
  };
  getFirmwareManifest: {
    args: [];
    return: unknown;
  };
  getFirmwareFile: {
    args: [filename: string];
    return: Buffer;
  };
  setDriverDisabled: {
    args: [driverId: string, disabled: boolean];
    return: { success: boolean };
  };
  setDriverFallbackEnabled: {
    args: [enabled: boolean];
    return: { success: boolean };
  };
  resetEventCounts: {
    args: [];
    return: undefined;
  };
  clearTransformerState: {
    args: [];
    return: undefined;
  };
  loadGif: {
    args: [];
    return: GifBitmapResult | null;
  };
  restartDriver: {
    args: [driverId: string];
    return: { success: boolean };
  };
  deleteDriver: {
    args: [driverId: string];
    return: { success: boolean };
  };
  showInFolder: {
    args: [filePath: string];
    return: undefined;
  };
  getLogSizes: {
    args: [];
    return: LogSizes;
  };
  clearAllLogs: {
    args: [];
    return: undefined;
  };
  createBackup: {
    args: [];
    return: { success: boolean; error?: string };
  };
  setDriverId: {
    args: [driverId: string, newId: string];
    return: undefined;
  };
}

/** Push method callback arg types. */
export interface PushContract {
  onDriverConnected: [driver: Driver];
  onDriverDisconnected: [driver: Driver, reason: DisconnectReason];
  onDriverUpdated: [driver: Driver];
  onDriverRestarting: [driver: Driver];
  onDriverDeleted: [driverId: string];
  onSystemStatus: [status: SystemStatus];
  onFlashOtaState: [
    data: { driverId: string; state: string },
  ];
  onFlashOtaProgress: [
    data: {
      driverId: string;
      sent: number;
      total: number;
      percent: number;
    },
  ];
  onFlashOtaError: [
    data: { driverId: string; error: string },
  ];
  onEvent: [topic: string, payload?: string];
}

/** Send method arg types. */
export interface SendContract {
  rendererReady: [];
  quitApp: [];
}

// ---------------------------------------------------------------------------
// Compile-time key checks
// ---------------------------------------------------------------------------

// Ensure channel maps and contracts have matching keys.
// Adding a method to one without the other causes a compile error.
const _invokeCheck: Record<keyof InvokeContract, string> =
  INVOKE_CHANNELS;
const _pushCheck: Record<keyof PushContract, string> =
  PUSH_CHANNELS;
const _sendCheck: Record<keyof SendContract, string> =
  SEND_CHANNELS;
void _invokeCheck;
void _pushCheck;
void _sendCheck;

// ---------------------------------------------------------------------------
// Derived API types
// ---------------------------------------------------------------------------

type InvokeMethods = {
  [K in keyof InvokeContract]: (
    ...args: InvokeContract[K]['args']
  ) => Promise<InvokeContract[K]['return']>;
};

type PushMethods = {
  [K in keyof PushContract]: (
    callback: (...args: PushContract[K]) => void,
  ) => () => void;
};

type SendMethods = {
  [K in keyof SendContract]: (
    ...args: SendContract[K]
  ) => void;
};

/** The complete renderer-facing API, auto-derived from the contracts. */
export type RgfxAPI = InvokeMethods & PushMethods & SendMethods;

// ---------------------------------------------------------------------------
// Backward-compatible push channel constants
// ---------------------------------------------------------------------------

/**
 * Push channel constants for the main process.
 * Same values as PUSH_CHANNELS but with UPPER_CASE keys matching
 * the existing codebase convention.
 */
export const IPC = {
  DRIVER_CONNECTED: PUSH_CHANNELS.onDriverConnected,
  DRIVER_DISCONNECTED: PUSH_CHANNELS.onDriverDisconnected,
  DRIVER_UPDATED: PUSH_CHANNELS.onDriverUpdated,
  DRIVER_RESTARTING: PUSH_CHANNELS.onDriverRestarting,
  DRIVER_DELETED: PUSH_CHANNELS.onDriverDeleted,
  SYSTEM_STATUS: PUSH_CHANNELS.onSystemStatus,
  FLASH_OTA_STATE: PUSH_CHANNELS.onFlashOtaState,
  FLASH_OTA_PROGRESS: PUSH_CHANNELS.onFlashOtaProgress,
  FLASH_OTA_ERROR: PUSH_CHANNELS.onFlashOtaError,
  EVENT_RECEIVED: PUSH_CHANNELS.onEvent,
} as const;

export type PushChannel =
  (typeof PUSH_CHANNELS)[keyof typeof PUSH_CHANNELS];
