// Shared types for IPC communication between main and renderer processes

/**
 * LED Configuration Types
 */
export type LEDChipset = 'WS2812B' | 'WS2811' | 'APA102' | 'SK6812' | 'SK9822';
export type ColorOrder = 'RGB' | 'GRB' | 'BGR' | 'RBG' | 'GBR' | 'BRG';
export type DeviceType = 'strip' | 'matrix';

export type LEDLayoutType =
  | 'strip'
  | 'matrix-tl-h' | 'matrix-tl-h-snake'
  | 'matrix-tr-h' | 'matrix-tr-h-snake'
  | 'matrix-bl-h' | 'matrix-bl-h-snake'
  | 'matrix-br-h' | 'matrix-br-h-snake'
  | 'matrix-tl-v' | 'matrix-tl-v-snake'
  | 'matrix-tr-v' | 'matrix-tr-v-snake'
  | 'matrix-bl-v' | 'matrix-bl-v-snake'
  | 'matrix-br-v' | 'matrix-br-v-snake';

export type ColorCorrection =
  | 'TypicalLEDStrip'
  | 'Typical8mmPixel'
  | 'UncorrectedColor';


export interface LEDDevice {
  id: string;
  name: string;
  pin: number;
  type: DeviceType;
  count: number;
  offset?: number;
  chipset?: LEDChipset;
  colorOrder?: ColorOrder;
  maxBrightness?: number;
  colorCorrection?: ColorCorrection;
  dataRateMhz?: number;
  width?: number;
  height?: number;
  serpentine?: boolean;
}

export interface DriverSettings {
  globalBrightnessLimit?: number;
  dithering?: boolean;
  powerSupplyVolts?: number;
  maxPowerMilliamps?: number;
}

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
  offset?: number;
  maxBrightness?: number;
  globalBrightnessLimit?: number;
  dithering?: boolean;
  powerSupplyVolts?: number;
  maxPowerMilliamps?: number;
}

export interface DriverSystemInfo {
  // Network information
  ip: string;
  mac: string;
  hostname: string;
  rssi: number;
  ssid: string;

  // Chip information
  chipModel: string;
  chipRevision: number;
  chipCores: number;
  cpuFreqMHz: number;

  // Memory information
  flashSize: number;
  flashSpeed: number;
  freeHeap: number;
  heapSize: number;
  psramSize: number;
  freePsram: number;

  // Software information
  firmwareVersion?: string;
  sdkVersion: string;
  sketchSize: number;
  freeSketchSpace: number;
  uptimeMs: number;

  // Display information
  hasDisplay: boolean;

  // Runtime state
  testActive?: boolean;

  // Note: LED configuration is managed by Hub (in Driver.ledConfig)
  // and pushed to drivers via MQTT - not reported in sysInfo
}

export interface DriverStats {
  mqttMessagesReceived: number;
  mqttMessagesFailed: number;
  udpMessagesSent: number;
  udpMessagesFailed: number;
}

export interface Driver {
  id: string;
  name: string;
  description?: string;
  connected: boolean;
  lastSeen: number;
  firstSeen: number;
  failedHeartbeats: number;
  ip?: string;
  sysInfo?: DriverSystemInfo;
  stats: DriverStats;
  updateRate?: number;
  ledConfig?: DriverLEDConfig;
  resolvedHardware?: LEDHardware;
  testActive?: boolean;
}

export interface SystemStatus {
  mqttBroker: "running" | "stopped" | "error";
  udpServer: "active" | "inactive" | "error";
  eventReader: "monitoring" | "stopped" | "error";
  driversConnected: number;
  hubIp: string;
}

export interface IpcApi {
  onDriverConnected: (callback: (driver: Driver) => void) => () => void;
  onDriverDisconnected: (callback: (driver: Driver) => void) => () => void;
  onDriverUpdated: (callback: (driver: Driver) => void) => () => void;
  onSystemStatus: (callback: (status: SystemStatus) => void) => () => void;
  testDriverLEDs: (driverId: string, enabled: boolean) => Promise<void>;
  rendererReady: () => void;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    rgfx: IpcApi;
  }
}
