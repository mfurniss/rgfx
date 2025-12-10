// Shared types for IPC communication between main and renderer processes

import type { EffectPayload } from './types/transformer-types';
import type { PersistedDriverFromSchema, RemoteLoggingLevel } from './schemas';

/**
 * Static application information returned by a single IPC call at startup
 */
export interface AppInfo {
  version: string;
  licensePath: string;
  defaultRgfxConfigDir: string;
  defaultMameRomsDir: string;
}

/**
 * LED Configuration Types
 */
type LEDChipset = 'WS2812B' | 'WS2811' | 'APA102' | 'SK6812' | 'SK9822';
type ColorOrder = 'RGB' | 'GRB' | 'BGR' | 'RBG' | 'GBR' | 'BRG';

type LEDLayoutType =
  | 'strip'
  | 'matrix-tl-h'
  | 'matrix-tl-h-snake'
  | 'matrix-tr-h'
  | 'matrix-tr-h-snake'
  | 'matrix-bl-h'
  | 'matrix-bl-h-snake'
  | 'matrix-br-h'
  | 'matrix-br-h-snake'
  | 'matrix-tl-v'
  | 'matrix-tl-v-snake'
  | 'matrix-tr-v'
  | 'matrix-tr-v-snake'
  | 'matrix-bl-v'
  | 'matrix-bl-v-snake'
  | 'matrix-br-v'
  | 'matrix-br-v-snake';

type ColorCorrection = 'TypicalLEDStrip' | 'Typical8mmPixel' | 'UncorrectedColor';

/**
 * LED Hardware definition - describes physical LED hardware only
 * Stored in led-hardware/ directory and shared across all users
 * This is a flat object containing only hardware specs, no user-configurable data
 */
export interface LEDHardware {
  name: string;
  description?: string;
  sku: string | null;
  asin?: string | null;
  layout: LEDLayoutType;
  count: number;
  chipset?: LEDChipset;
  colorOrder?: ColorOrder;
  colorCorrection?: ColorCorrection;
  width?: number;
  height?: number;
}

/**
 * Driver LED Configuration - combines hardware reference with driver-specific settings
 * Stored per-driver in drivers.json
 * Settings are flattened directly into this object (no nested settings object)
 */
export interface DriverLEDConfig {
  hardwareRef: string;
  pin: number;
  offset?: number | null;
  maxBrightness?: number | null;
  globalBrightnessLimit?: number | null;
  dithering?: boolean | null;
  powerSupplyVolts?: number | null;
  maxPowerMilliamps?: number | null;
  /**
   * Unified panel layout - 2D array mapping grid positions to panel chain indices with rotation.
   * Array structure defines grid: rows = length, cols = first row length.
   * Each string is "<index><rotation>" where:
   *   - index = panel's position in the physical LED chain (0 = first panel wired)
   *   - rotation = optional letter: a=0°, b=90°, c=180°, d=270° (default: a)
   * Examples: "0", "0a", "1b", "2c", "3d"
   * Full example: [["0a", "1b"], ["3d", "2c"]] = 2x2 grid with per-panel rotation
   * Defaults to null (single panel, no unification)
   */
  unified?: string[][] | null;
}

/**
 * Driver telemetry - hardware and firmware information reported by driver
 * Contains static/semi-static information that only the driver can know
 * Sent periodically via rgfx/system/driver/telemetry topic
 */
export interface DriverTelemetry {
  // Hardware information
  chipModel: string;
  chipRevision: number;
  chipCores: number;
  cpuFreqMHz: number;
  flashSize: number;
  flashSpeed: number;
  heapSize: number;
  psramSize: number;
  freePsram: number;
  hasDisplay: boolean;

  // Firmware information
  firmwareVersion?: string;
  sdkVersion: string;
  sketchSize: number;
  freeSketchSpace: number;

  // Crash/reset information
  lastResetReason?: string;
  crashCount?: number;

  // Note: LED configuration is managed by Hub (in Driver.ledConfig)
  // and pushed to drivers via MQTT - not reported in telemetry
}

interface DriverStats {
  mqttMessagesReceived: number;
  mqttMessagesFailed: number;
  udpMessagesSent: number;
  udpMessagesFailed: number;
}

export class Driver {
  // Driver identity
  id: string;
  description?: string;

  // Network information (hub-observable)
  ip?: string;
  mac?: string;
  hostname?: string;
  ssid?: string;

  // Configuration
  remoteLogging?: RemoteLoggingLevel;

  // Runtime metrics (updated via telemetry)
  rssi?: number;
  freeHeap?: number;
  minFreeHeap?: number;
  uptimeMs?: number;

  // Connection tracking
  lastSeen: number;
  failedHeartbeats: number;
  lastHeartbeat?: number;
  lastSeenAt?: number; // Timestamp when last telemetry was received

  // Hardware/firmware telemetry (static info from driver)
  telemetry?: DriverTelemetry;

  // LED configuration and hardware
  ledConfig?: DriverLEDConfig | null;
  resolvedHardware?: LEDHardware;

  // Statistics
  stats: DriverStats;
  updateRate?: number;

  // Runtime state
  testActive?: boolean;
  connected: boolean;

  constructor(data: {
    id: string;
    description?: string;
    ip?: string;
    mac?: string;
    hostname?: string;
    ssid?: string;
    remoteLogging?: RemoteLoggingLevel;
    rssi?: number;
    freeHeap?: number;
    minFreeHeap?: number;
    uptimeMs?: number;
    lastSeen: number;
    failedHeartbeats: number;
    lastHeartbeat?: number;
    lastSeenAt?: number;
    telemetry?: DriverTelemetry;
    ledConfig?: DriverLEDConfig | null;
    resolvedHardware?: LEDHardware;
    stats: DriverStats;
    updateRate?: number;
    testActive?: boolean;
    connected: boolean;
  }) {
    this.id = data.id;
    this.description = data.description;
    this.ip = data.ip;
    this.mac = data.mac;
    this.hostname = data.hostname;
    this.ssid = data.ssid;
    this.remoteLogging = data.remoteLogging;
    this.rssi = data.rssi;
    this.freeHeap = data.freeHeap;
    this.minFreeHeap = data.minFreeHeap;
    this.uptimeMs = data.uptimeMs;
    this.lastSeen = data.lastSeen;
    this.failedHeartbeats = data.failedHeartbeats;
    this.lastHeartbeat = data.lastHeartbeat;
    this.lastSeenAt = data.lastSeenAt;
    this.telemetry = data.telemetry;
    this.ledConfig = data.ledConfig;
    this.resolvedHardware = data.resolvedHardware;
    this.stats = data.stats;
    this.updateRate = data.updateRate;
    this.testActive = data.testActive;
    this.connected = data.connected;
  }
}

/**
 * Serialize a Driver instance for IPC transmission to renderer process
 */
export function serializeDriverForIPC(driver: Driver) {
  return {
    id: driver.id,
    description: driver.description,
    ip: driver.ip,
    mac: driver.mac,
    hostname: driver.hostname,
    ssid: driver.ssid,
    remoteLogging: driver.remoteLogging,
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
    connected: driver.connected,
  };
}

export interface SystemStatus {
  mqttBroker: 'running' | 'stopped' | 'error';
  udpServer: 'active' | 'inactive' | 'error';
  eventReader: 'monitoring' | 'stopped' | 'error';
  driversConnected: number;
  hubIp: string;
  eventsProcessed: number;
  hubStartTime: number;
  currentFirmwareVersion?: string;
}

export interface EventTopicData {
  topic: string;
  count: number;
  lastValue?: string;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    rgfx: {
      getAppInfo: () => Promise<AppInfo>;

      onDriverConnected: (callback: (driver: Driver) => void) => () => void;
      onDriverDisconnected: (callback: (driver: Driver) => void) => () => void;
      onDriverUpdated: (callback: (driver: Driver) => void) => () => void;
      onSystemStatus: (callback: (status: SystemStatus) => void) => () => void;
      onEventCount: (callback: (count: number) => void) => () => void;
      onEventTopic: (callback: (data: EventTopicData) => void) => () => void;
      onFlashOtaState: (
        callback: (data: { driverId: string; state: string }) => void,
      ) => () => void;
      onFlashOtaProgress: (
        callback: (progress: {
          driverId: string;
          sent: number;
          total: number;
          percent: number;
        }) => void,
      ) => () => void;
      sendDriverCommand: (driverId: string, command: string, payload?: string) => Promise<void>;
      updateDriverConfig: (driverId: string) => Promise<void>;
      flashOTA: (
        driverId: string
      ) => Promise<{ success: boolean; error?: string; output?: string }>;
      rendererReady: () => void;
      triggerDiscovery: () => Promise<void>;
      triggerEffect: (payload: EffectPayload) => Promise<void>;
      saveDriverConfig: (config: PersistedDriverFromSchema) => Promise<{ success: boolean }>;
      getLEDHardwareList: () => Promise<string[]>;
      openDriverLog: (driverId: string) => Promise<{ success: boolean; error?: string }>;
      openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      listGames: () => Promise<GameInfo[]>;
      simulateEvent: (eventLine: string) => Promise<void>;
      selectDirectory: (title?: string, defaultPath?: string) => Promise<string | null>;
      verifyDirectory: (path: string) => Promise<boolean>;
    };
  }
}

export interface GameInfo {
  romName: string;
  interceptorPath: string | null;
  interceptorName: string | null;
  transformerPath: string | null;
  transformerName: string | null;
}
