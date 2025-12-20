/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import type { DriverRegistry } from './driver-registry';
import type { MqttBroker } from './network';

/**
 * Sends clear-effects commands to all connected drivers.
 * Used during app shutdown to turn off LED effects.
 * Waits for all messages to be published before returning.
 */
export async function clearEffectsOnAllDrivers(
  driverRegistry: DriverRegistry,
  mqtt: MqttBroker,
): Promise<void> {
  const connectedDrivers = driverRegistry.getConnectedDrivers();

  const publishPromises = connectedDrivers.map((driver) => {
    const topic = `rgfx/driver/${driver.id}/clear-effects`;
    log.info(`Sending clear-effects to driver ${driver.id}`);

    return mqtt.publish(topic, '');
  });

  await Promise.all(publishPromises);
}
