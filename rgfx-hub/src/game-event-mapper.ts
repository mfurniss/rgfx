/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { DriverRegistry } from './driver-registry';
import { Udp } from './udp';
import log from 'electron-log/main';

// Maps game events to LED effects and broadcasts to all connected drivers
export class GameEventMapper {
  private driverRegistry: DriverRegistry;

  constructor(driverRegistry: DriverRegistry) {
    this.driverRegistry = driverRegistry;
  }

  // Broadcast effect to all connected drivers
  private broadcastEffect(effect: string, color: string) {
    const connectedDrivers = this.driverRegistry
      .getAllDrivers()
      .filter((driver) => driver.connected && driver.ip);

    if (connectedDrivers.length === 0) {
      log.warn('No connected drivers to send effect to');
      return;
    }

    // Convert 0xRRGGBB to #RRGGBB format for ESP32
    const hexColor = color.replace('0x', '#');

    // Send to each driver
    connectedDrivers.forEach((driver) => {
      if (!driver.ip) return;

      const udp = new Udp(driver.ip, 1234);
      udp.send({ effect, props: { color: hexColor } });
      // Note: UDP socket will be garbage collected after send completes
    });

    log.info(
      `Broadcasted effect "${effect}" with color ${hexColor} to ${connectedDrivers.length} driver(s)`
    );
  }

  // Handle incoming game event and map to LED effect
  handleEvent(topic: string, message: string) {
    // Pac-Man: Power pill state change
    if (topic === 'player/pill/state') {
      const state = parseInt(message);
      // Power pill active - blue pulse, otherwise red pulse
      const color = state > 0 ? '0x0000FF' : '0xFF0000';
      this.broadcastEffect('pulse', color);
    }
    // Pac-Man: Score changes (with /p1 or /p2 suffix)
    else if (topic.startsWith('player/score/')) {
      this.broadcastEffect('pulse', '0xFFFF00');
    }
    // Super Mario Bros: Score changes (no suffix)
    else if (topic === 'player/score') {
      this.broadcastEffect('pulse', '0xFFFF00');
    }
    // Super Mario Bros: Jump
    else if (topic === 'player/jump') {
      this.broadcastEffect('pulse', '0xFF0000'); // Red pulse
    }
    // Super Mario Bros: Coin pickup
    else if (topic === 'player/coin') {
      this.broadcastEffect('pulse', '0xFFFF00'); // Yellow pulse
    }
    // Super Mario Bros: Music track change
    else if (topic === 'game/music') {
      this.broadcastEffect('pulse', '0xFF00FF'); // Purple pulse
    }
    // Super Mario Bros: Fireball shot
    else if (topic === 'player/fireball') {
      this.broadcastEffect('pulse', '0xFF8000'); // Orange pulse
    }
    // Catch-all: Any other game event (Galaga, etc.)
    else {
      this.broadcastEffect('pulse', '0x0000FF'); // Blue pulse
    }

    log.info(`Event received: ${topic} = ${message}`);
  }
}
