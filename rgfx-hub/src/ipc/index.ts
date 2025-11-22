/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { DriverRegistry } from '../driver-registry';
import type { Mqtt } from '../mqtt';
import type { UdpClient } from '../types/mapping-types';
import { registerSetIdHandler } from './set-id-handler';
import { registerFlashOtaHandler } from './flash-ota-handler';
import { registerTriggerEffectHandler } from './trigger-effect-handler';
import { registerSendDriverCommandHandler } from './send-driver-command-handler';
import { registerUpdateDriverConfigHandler } from './update-driver-config-handler';

interface IpcHandlersDeps {
  driverRegistry: DriverRegistry;
  mqtt: Mqtt;
  pushConfigToDriver: (macAddress: string) => Promise<void>;
  udpClient: UdpClient;
}

export function registerIpcHandlers(deps: IpcHandlersDeps): void {
  registerSetIdHandler(deps);
  registerFlashOtaHandler(deps);
  registerTriggerEffectHandler(deps);
  registerSendDriverCommandHandler(deps);
  registerUpdateDriverConfigHandler(deps);
}
