/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { DriverRegistry } from '../driver-registry';
import type { Mqtt } from '../mqtt';
import type { UdpClient } from '../types/mapping-types';
import { registerTestLedsHandler } from './test-leds-handler';
import { registerSetIdHandler } from './set-id-handler';
import { registerFlashOtaHandler } from './flash-ota-handler';
import { registerTriggerEffectHandler } from './trigger-effect-handler';

interface IpcHandlersDeps {
  driverRegistry: DriverRegistry;
  mqtt: Mqtt;
  pushConfigToDriver: (macAddress: string) => Promise<void>;
  udpClient: UdpClient;
}

export function registerIpcHandlers(deps: IpcHandlersDeps): void {
  registerTestLedsHandler(deps);
  registerSetIdHandler(deps);
  registerFlashOtaHandler(deps);
  registerTriggerEffectHandler(deps);
}
