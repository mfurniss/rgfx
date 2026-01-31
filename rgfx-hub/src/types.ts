// Shared types for IPC communication between main and renderer processes

import type { EffectPayload, GifBitmapResult } from './types/transformer-types';
import type { ConfiguredDriverFromSchema, RemoteLoggingLevel } from './schemas';

/**
 * Static application information returned by a single IPC call at startup
 */
export interface AppInfo {
  version: string;
  licensePath: string;
  docsPath: string;
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
  /**
   * Single-panel virtual rotation (ignored if unified is set)
   * Rotates the panel display without physical rewiring.
   * Values: '0' (default), '90', '180', '270' degrees clockwise.
   */
  rotation?: '0' | '90' | '180' | '270' | null;
  /**
   * Reverse LED direction for strips (default: false)
   * When true, logical index 0 maps to the last physical LED.
   * Only applicable to strip layouts, ignored for matrices.
   */
  reverse?: boolean | null;
  /**
   * Gamma correction per channel (1.0 = linear, 2.8 = typical for WS2812B)
   * Compensates for non-linear human brightness perception
   * Defaults to { r: 2.8, g: 2.8, b: 2.8 }
   */
  gamma: {
    r?: number | null;
    g?: number | null;
    b?: number | null;
  };
  /**
   * Floor cutoff per channel (0-255, default 0)
   * Values at or below floor are cut off to 0 after gamma correction
   * Prevents dim red bleed at low brightness (red LEDs have lower forward voltage)
   */
  floor: {
    r: number;
    g: number;
    b: number;
  };
  /**
   * RGBW color mode for 4-channel LED strips (default: 'exact')
   * - 'exact': Accurate colors, RGB channels active alongside white for color reproduction
   * - 'max_brightness': Maximizes white channel usage, slight desaturation for whites/grays
   * Only applicable to RGBW strips (colorOrder containing 'W')
   */
  rgbwMode?: 'exact' | 'max_brightness' | null;
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
  maxAllocHeap: number;
  psramSize: number;
  freePsram: number;

  // Firmware information
  firmwareVersion?: string;
  sdkVersion: string;
  sketchSize: number;
  freeSketchSpace: number;

  // Crash/reset information
  lastResetReason?: string;
  crashCount?: number;

  // FPS metrics
  currentFps: number;
  minFps: number;
  maxFps: number;

  // Frame timing metrics (microseconds per frame, averaged)
  frameTiming?: {
    clearUs: number;
    effectsUs: number;
    downsampleUs: number;
    showUs: number;
    totalUs: number;
  };

  // Note: LED configuration is managed by Hub (in Driver.ledConfig)
  // and pushed to drivers via MQTT - not reported in telemetry
}

/**
 * Driver connection state enum
 */
export type DriverState = 'connected' | 'disconnected' | 'updating';

/**
 * Driver Statistics - accumulated counters
 */
interface DriverStats {
  telemetryEventsReceived: number;
  mqttMessagesReceived: number;
  mqttMessagesFailed: number;
}

/**
 * Driver Identity - immutable after creation
 */
interface DriverIdentity {
  id: string;
  mac?: string;
  description?: string;
}

/**
 * Driver Network State - changes when driver connects
 */
interface DriverNetworkState {
  ip?: string;
  hostname?: string;
  ssid?: string;
  rssi?: number;
}

/**
 * Driver Metrics - updated every telemetry message
 */
interface DriverMetrics {
  freeHeap?: number;
  minFreeHeap?: number;
  uptimeMs?: number;
  lastSeenAt?: number;
}

/**
 * Driver Config - user-defined, persisted
 */
interface DriverConfigData {
  remoteLogging?: RemoteLoggingLevel;
  ledConfig?: DriverLEDConfig | null;
  resolvedHardware?: LEDHardware;
  disabled: boolean;
}

/**
 * Driver Hardware Info - semi-static, from device
 */
interface DriverHardwareInfo {
  telemetry?: DriverTelemetry;
}

/**
 * Driver Connection State - internal state tracking
 */
interface DriverConnectionState {
  state: DriverState;
  lastSeen: number;
  failedHeartbeats: number;
  lastHeartbeat?: number;
  testActive?: boolean;
  updateRate?: number;
}

/**
 * Driver - composite type combining all driver-related interfaces
 * This is a plain object, not a class - use createDriver() to construct
 */
export type Driver = DriverIdentity
  & DriverNetworkState
  & DriverMetrics
  & DriverConfigData
  & DriverHardwareInfo
  & { stats: DriverStats }
  & DriverConnectionState;

/**
 * Input type for createDriver - all fields optional except id
 */
export type DriverInput = Partial<Driver> & { id: string };

/**
 * Default values for Driver fields
 */
const defaultDriverStats: DriverStats = {
  telemetryEventsReceived: 0,
  mqttMessagesReceived: 0,
  mqttMessagesFailed: 0,
};

/**
 * Factory function to create a Driver object with defaults
 */
export function createDriver(data: DriverInput): Driver {
  return {
    // Identity
    id: data.id,
    mac: data.mac,
    description: data.description,
    // Network
    ip: data.ip,
    hostname: data.hostname,
    ssid: data.ssid,
    rssi: data.rssi,
    // Metrics
    freeHeap: data.freeHeap,
    minFreeHeap: data.minFreeHeap,
    uptimeMs: data.uptimeMs,
    lastSeenAt: data.lastSeenAt,
    // Config
    remoteLogging: data.remoteLogging,
    ledConfig: data.ledConfig,
    resolvedHardware: data.resolvedHardware,
    disabled: data.disabled ?? false,
    // Hardware
    telemetry: data.telemetry,
    // Stats
    stats: data.stats ?? { ...defaultDriverStats },
    // Connection
    state: data.state ?? 'disconnected',
    lastSeen: data.lastSeen ?? 0,
    failedHeartbeats: data.failedHeartbeats ?? 0,
    lastHeartbeat: data.lastHeartbeat,
    testActive: data.testActive,
    updateRate: data.updateRate,
  };
}

/**
 * Serialize a Driver for IPC transmission to renderer process
 * Since Driver is now a plain object, this is just a shallow copy
 */
export function serializeDriverForIPC(driver: Driver): Driver {
  return { ...driver };
}

export interface SystemError {
  errorType: 'interceptor' | 'config' | 'driver' | 'network' | 'transformer' | 'general';
  message: string;
  timestamp: number;
  filePath?: string;
  details?: string;
  driverId?: string;
}

export interface UdpStats {
  sent: number;
  failed: number;
}

export interface SystemStatus {
  mqttBroker: 'running' | 'stopped' | 'error';
  discovery: 'active' | 'inactive' | 'error';
  eventReader: 'monitoring' | 'stopped' | 'error';
  driversConnected: number;
  driversTotal: number;
  hubIp: string;
  eventsProcessed: number;
  eventLogSizeBytes: number;
  hubStartTime: number;
  /** Firmware versions indexed by chip type (ESP32, ESP32-S3) */
  firmwareVersions?: Record<string, string>;
  udpMessagesSent: number;
  udpMessagesFailed: number;
  udpStatsByDriver: Record<string, UdpStats>;
  systemErrors: readonly SystemError[];
}

export type DisconnectReason = 'disconnected' | 'restarting' | 'timeout';

// Extend Window interface for TypeScript
declare global {
  interface Window {
    rgfx: {
      getAppInfo: () => Promise<AppInfo>;

      onDriverConnected: (callback: (driver: Driver) => void) => () => void;
      onDriverDisconnected: (
        callback: (driver: Driver, reason: DisconnectReason) => void,
      ) => () => void;
      onDriverUpdated: (callback: (driver: Driver) => void) => () => void;
      onDriverRestarting: (callback: (driver: Driver) => void) => () => void;
      onSystemStatus: (callback: (status: SystemStatus) => void) => () => void;
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
      onFlashOtaError: (
        callback: (data: { driverId: string; error: string }) => void,
      ) => () => void;
      sendDriverCommand: (driverId: string, command: string, payload?: string) => Promise<void>;
      updateDriverConfig: (driverId: string) => Promise<void>;
      flashOTA: (
        driverId: string
      ) => Promise<{ success: boolean; error?: string; output?: string }>;
      rendererReady: () => void;
      triggerDiscovery: () => Promise<void>;
      triggerEffect: (payload: EffectPayload) => Promise<void>;
      saveDriverConfig: (
        config: ConfiguredDriverFromSchema
      ) => Promise<{ success: boolean }>;
      getLEDHardwareList: () => Promise<string[]>;
      getLEDHardware: (hardwareRef: string) => Promise<LEDHardware | null>;
      openDriverLog: (driverId: string) => Promise<{ success: boolean; error?: string }>;
      openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      listGames: (romsDirectory?: string) => Promise<GameInfo[]>;
      simulateEvent: (eventLine: string) => Promise<void>;
      selectDirectory: (title?: string, defaultPath?: string) => Promise<string | null>;
      verifyDirectory: (path: string) => Promise<boolean>;
      getFirmwareManifest: () => Promise<unknown>;
      getFirmwareFile: (filename: string) => Promise<Buffer>;
      setDriverDisabled: (driverId: string, disabled: boolean) => Promise<{ success: boolean }>;
      onEvent: (callback: (topic: string, payload?: string) => void) => () => void;
      resetEventCounts: () => Promise<void>;
      loadGif: () => Promise<GifBitmapResult | null>;
      restartDriver: (driverId: string) => Promise<{ success: boolean }>;
      deleteDriver: (driverId: string) => Promise<{ success: boolean }>;
      onDriverDeleted: (callback: (driverId: string) => void) => () => void;
      showInFolder: (filePath: string) => Promise<void>;
      quitApp: () => void;
    };
  }
}

export interface GameInfo {
  romName: string | null;
  interceptorPath: string | null;
  interceptorName: string | null;
  transformerPath: string | null;
  transformerName: string | null;
}
