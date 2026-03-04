import type { RemoteLoggingLevel } from '../schemas';

/**
 * LED Configuration Types
 */
type LEDChipset = 'WS2812B' | 'WS2811' | 'SK6812' | 'WS2814';
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

type ColorCorrection =
  | 'TypicalLEDStrip'
  | 'Typical8mmPixel'
  | 'UncorrectedColor';

/**
 * LED Hardware definition - describes physical LED hardware only
 * Stored in led-hardware/ directory and shared across all users
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
 */
export interface DriverTelemetry {
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

  firmwareVersion?: string;
  sdkVersion: string;
  sketchSize: number;
  freeSketchSpace: number;

  lastResetReason?: string;
  crashCount?: number;

  currentFps: number;
  minFps: number;
  maxFps: number;

  frameTiming?: {
    clearUs: number;
    effectsUs: number;
    downsampleUs: number;
    showUs: number;
    totalUs: number;
  };

  ledHealthy?: boolean;
}

export type DriverState = 'connected' | 'disconnected' | 'updating';

interface DriverStats {
  telemetryEventsReceived: number;
  mqttMessagesReceived: number;
  mqttMessagesFailed: number;
}

interface DriverIdentity {
  id: string;
  mac?: string;
  description?: string;
}

interface DriverNetworkState {
  ip?: string;
  hostname?: string;
  ssid?: string;
  rssi?: number;
}

interface DriverMetrics {
  freeHeap?: number;
  minFreeHeap?: number;
  uptimeMs?: number;
  lastSeenAt?: number;
}

interface DriverConfigData {
  remoteLogging?: RemoteLoggingLevel;
  ledConfig?: DriverLEDConfig | null;
  resolvedHardware?: LEDHardware;
  disabled: boolean;
}

interface DriverHardwareInfo {
  telemetry?: DriverTelemetry;
}

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
 */
export type Driver = DriverIdentity
  & DriverNetworkState
  & DriverMetrics
  & DriverConfigData
  & DriverHardwareInfo
  & { stats: DriverStats }
  & DriverConnectionState;

export type DriverInput = Partial<Driver> & { id: string };

const defaultDriverStats: DriverStats = {
  telemetryEventsReceived: 0,
  mqttMessagesReceived: 0,
  mqttMessagesFailed: 0,
};

export function createDriver(data: DriverInput): Driver {
  return {
    id: data.id,
    mac: data.mac,
    description: data.description,
    ip: data.ip,
    hostname: data.hostname,
    ssid: data.ssid,
    rssi: data.rssi,
    freeHeap: data.freeHeap,
    minFreeHeap: data.minFreeHeap,
    uptimeMs: data.uptimeMs,
    lastSeenAt: data.lastSeenAt,
    remoteLogging: data.remoteLogging,
    ledConfig: data.ledConfig,
    resolvedHardware: data.resolvedHardware,
    disabled: data.disabled ?? false,
    telemetry: data.telemetry,
    stats: data.stats ?? { ...defaultDriverStats },
    state: data.state ?? 'disconnected',
    lastSeen: data.lastSeen ?? 0,
    failedHeartbeats: data.failedHeartbeats ?? 0,
    lastHeartbeat: data.lastHeartbeat,
    testActive: data.testActive,
    updateRate: data.updateRate,
  };
}

export type DisconnectReason = 'disconnected' | 'restarting' | 'timeout';
