export interface SystemError {
  errorType:
    | 'interceptor'
    | 'config'
    | 'driver'
    | 'network'
    | 'transformer'
    | 'video'
    | 'general';
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
  /** Release URL when a newer version exists on GitHub */
  updateAvailable?: string;
}

export interface GameInfo {
  romName: string | null;
  interceptorPath: string | null;
  interceptorName: string | null;
  transformerPath: string | null;
  transformerName: string | null;
}
