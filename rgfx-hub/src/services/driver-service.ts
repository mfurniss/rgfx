/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import type { Driver } from '../types';
import type { MqttBroker } from '../network';
import { eventBus } from './event-bus';

interface RebootDriverDeps {
  mqtt: MqttBroker;
}

/**
 * Reboots a driver and updates its state to disconnected.
 * Emits driver:restarting and driver:disconnected events.
 */
export async function rebootDriver(driver: Driver, deps: RebootDriverDeps): Promise<void> {
  const { mqtt } = deps;

  // Notify renderer that driver is restarting (suppresses disconnect notification)
  eventBus.emit('driver:restarting', { driver });

  // Send reboot command
  const rebootTopic = `rgfx/driver/${driver.id}/reboot`;
  await mqtt.publish(rebootTopic, '');
  log.info(`Reboot command sent to driver ${driver.id}`);

  // Mark driver as disconnected
  driver.state = 'disconnected';
  driver.ip = undefined;
  eventBus.emit('driver:disconnected', { driver, reason: 'restarting' });
}
