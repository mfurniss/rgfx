/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { BrowserWindow } from 'electron';
import type { DriverRegistry } from '../driver-registry';
import type { DriverPersistence } from '../driver-persistence';
import type { DriverLogPersistence } from '../driver-log-persistence';
import type { LEDHardwareManager } from '../led-hardware-manager';
import type { MqttBroker } from '../network';
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

interface IpcHandlersDeps {
  driverRegistry: DriverRegistry;
  driverPersistence: DriverPersistence;
  driverLogPersistence: DriverLogPersistence;
  ledHardwareManager: LEDHardwareManager;
  mqtt: MqttBroker;
  uploadConfigToDriver: (macAddress: string) => Promise<boolean>;
  udpClient: UdpClient;
  transformerEngine: TransformerEngine;
  onEventProcessed: (topic: string, payload: string) => void;
  resetEventsProcessed: () => void;
  getMainWindow: () => BrowserWindow | null;
}

export function registerIpcHandlers(deps: IpcHandlersDeps): void {
  registerSetIdHandler(deps);
  registerFlashOtaHandler(deps);
  registerTriggerEffectHandler(deps);
  registerSendDriverCommandHandler(deps);
  registerUpdateDriverConfigHandler(deps);
  registerSaveDriverConfigHandler(deps);
  registerListLEDHardwareHandler(deps);
  registerGetLEDHardwareHandler(deps);
  registerOpenDriverLogHandler(deps);
  registerOpenFileHandler();
  registerListGamesHandler();
  registerSimulateEventHandler(deps);
  registerSelectDirectoryHandler();
  registerVerifyDirectoryHandler();
  registerGetAppInfoHandler();
  registerFirmwareFilesHandler();
  registerSetDriverDisabledHandler(deps);
  registerResetEventCountsHandler(deps);
  registerRestartDriverHandler(deps);
  registerDeleteDriverHandler(deps);
}
