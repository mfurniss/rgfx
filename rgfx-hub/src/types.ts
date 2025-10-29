// Shared types for IPC communication between main and renderer processes

/**
 * LED Configuration Types
 */
export type LEDChipset = 'WS2812B' | 'WS2811' | 'APA102' | 'SK6812' | 'SK9822';
export type ColorOrder = 'RGB' | 'GRB' | 'BGR' | 'RBG' | 'GBR' | 'BRG';
export type DeviceType = 'strip' | 'matrix';

export type ColorCorrection =
  | 'TypicalLEDStrip'
  | 'Typical8mmPixel'
  | 'UncorrectedColor';

export type ColorTemperature =
  | 'Candle'
  | 'Tungsten40W'
  | 'Tungsten100W'
  | 'Halogen'
  | 'CarbonArc'
  | 'HighNoonSun'
  | 'DirectSunlight'
  | 'OvercastSky'
  | 'ClearBlueSky'
  | 'WarmFluorescent'
  | 'StandardFluorescent'
  | 'CoolWhiteFluorescent'
  | 'FullSpectrumFluorescent'
  | 'GrowLightFluorescent'
  | 'BlackLightFluorescent'
  | 'MercuryVapor'
  | 'SodiumVapor'
  | 'MetalHalide'
  | 'HighPressureSodium'
  | 'UncorrectedTemperature';

export interface LEDDevice {
  id: string;
  name: string;
  pin: number;
  type: DeviceType;
  count: number;
  offset?: number;
  chipset?: LEDChipset;
  color_order?: ColorOrder;
  max_brightness?: number;
  color_correction?: ColorCorrection;
  color_temperature?: ColorTemperature;
  data_rate_mhz?: number;
  width?: number;
  height?: number;
  serpentine?: boolean;
}

export interface DriverSettings {
  global_brightness_limit?: number;
  gamma_correction?: number;
  dithering?: boolean;
  update_rate?: number;
  power_supply_volts?: number;
  max_power_milliamps?: number;
}

export interface DriverConfig {
  name: string;
  description?: string;
  version: string;
  led_devices: LEDDevice[];
  settings?: DriverSettings;
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
  sdkVersion: string;
  sketchSize: number;
  freeSketchSpace: number;
  uptimeMs: number;

  // Display information
  hasDisplay: boolean;

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
  type: "driver" | "controller";
  connected: boolean;
  lastSeen: number;
  firstSeen: number;
  ip?: string;
  sysInfo?: DriverSystemInfo;
  stats: DriverStats;
  ledConfig?: DriverConfig;
  ledConfigRef?: string;
}

export interface SystemStatus {
  mqttBroker: "running" | "stopped" | "error";
  udpServer: "active" | "inactive" | "error";
  eventReader: "monitoring" | "stopped" | "error";
  driversConnected: number;
  hubIp: string;
}

export interface IpcApi {
  onDriverConnected: (callback: (driver: Driver) => void) => void;
  onDriverDisconnected: (callback: (driver: Driver) => void) => void;
  onSystemStatus: (callback: (status: SystemStatus) => void) => void;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    rgfx: IpcApi;
  }
}
