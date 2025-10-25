// Shared types for IPC communication between main and renderer processes

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

  // LED configuration
  ledCount: number;
  matrixWidth: number;
  matrixHeight: number;
  ledDataPin: number;
  ledBrightness: number;
  ledMaxBrightness: number;
  ledChipset: string;
  ledColorOrder: string;
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
  type: "driver" | "controller";
  connected: boolean;
  lastSeen: number;
  firstSeen: number;
  ip?: string;
  sysInfo?: DriverSystemInfo;
  stats: DriverStats;
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
