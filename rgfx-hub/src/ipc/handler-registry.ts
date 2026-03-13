import type { BrowserWindow } from 'electron';
import type { DriverRegistry } from '../driver-registry';
import type { DriverConfig } from '../driver-config';
import type { DriverLogPersistence } from '../driver-log-persistence';
import type { LogManager } from '../log-manager';
import type { LEDHardwareManager } from '../led-hardware-manager';
import type { MqttBroker } from '../network';
import type { SystemMonitor } from '../system-monitor';
import type { TransformerEngine } from '../transformer-engine';
import type { UdpClient } from '../types/transformer-types';
import { registerSetIdHandler } from './set-id-handler';
import { registerFlashOtaHandler } from './flash-ota-handler';
import { registerTriggerEffectHandler } from './trigger-effect-handler';
import { registerSendDriverCommandHandler } from './send-driver-command-handler';
import { registerUpdateDriverConfigHandler } from './update-driver-config-handler';
import { registerSaveDriverConfigHandler } from './save-driver-config-handler';
import { registerListLEDHardwareHandler } from './list-led-hardware-handler';
import { registerGetLEDHardwareHandler } from './get-led-hardware-handler';
import { registerOpenDriverLogHandler } from './open-driver-log-handler';
import { registerOpenFileHandler } from './open-file-handler';
import { registerListGamesHandler } from './list-games-handler';
import { registerSimulateEventHandler } from './simulate-event-handler';
import { registerSelectDirectoryHandler } from './select-directory-handler';
import { registerVerifyDirectoryHandler } from './verify-directory-handler';
import { registerGetAppInfoHandler } from './get-app-info-handler';
import { registerFirmwareFilesHandler } from './firmware-files-handler';
import { registerSetDriverDisabledHandler } from './set-driver-disabled-handler';
import { registerResetEventCountsHandler } from './reset-event-counts-handler';
import { registerRestartDriverHandler } from './restart-driver-handler';
import { registerDeleteDriverHandler } from './delete-driver-handler';
import { registerLoadGifHandler } from './load-gif-handler';
import { registerLogsHandler } from './logs-handler';
import { registerClearTransformerStateHandler } from './clear-transformer-state-handler';
import { registerBackupHandler } from './backup-handler';
import { registerSetDriverFallbackHandler } from './set-driver-fallback-handler';
import { registerOpenExternalHandler } from './open-external-handler';
import { registerReinstallAssetsHandler } from './reinstall-assets-handler';
import { registerLaunchMameHandler } from './launch-mame-handler';

export interface IpcHandlersDeps {
  driverRegistry: DriverRegistry;
  driverConfig: DriverConfig;
  driverLogPersistence: DriverLogPersistence;
  logManager: LogManager;
  ledHardwareManager: LEDHardwareManager;
  mqtt: MqttBroker;
  systemMonitor: SystemMonitor;
  uploadConfigToDriver: (macAddress: string) => Promise<boolean>;
  udpClient: UdpClient;
  transformerEngine: TransformerEngine;
  onEventProcessed: (topic: string, payload: string) => void;
  resetEventsProcessed: () => void;
  getMainWindow: () => BrowserWindow | null;
}

// Each handler accepts either its own narrow deps interface or no args.
// Both are assignable to (deps: IpcHandlersDeps) => void via contravariance.
export const handlers: ((deps: IpcHandlersDeps) => void)[] = [
  registerSetIdHandler,
  registerFlashOtaHandler,
  registerTriggerEffectHandler,
  registerSendDriverCommandHandler,
  registerUpdateDriverConfigHandler,
  registerSaveDriverConfigHandler,
  registerListLEDHardwareHandler,
  registerGetLEDHardwareHandler,
  registerOpenDriverLogHandler,
  registerOpenFileHandler,
  registerListGamesHandler,
  registerSimulateEventHandler,
  registerSelectDirectoryHandler,
  registerVerifyDirectoryHandler,
  registerGetAppInfoHandler,
  registerFirmwareFilesHandler,
  registerSetDriverDisabledHandler,
  registerResetEventCountsHandler,
  registerRestartDriverHandler,
  registerDeleteDriverHandler,
  registerLoadGifHandler,
  registerLogsHandler,
  registerClearTransformerStateHandler,
  registerBackupHandler,
  registerSetDriverFallbackHandler,
  registerOpenExternalHandler,
  registerReinstallAssetsHandler,
  registerLaunchMameHandler,
];
