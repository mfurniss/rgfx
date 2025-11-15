/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { networkInterfaces } from 'node:os';
import type { SystemStatus } from './types';

export class SystemMonitor {
  // Get Hub's local IP address (first non-internal IPv4 address)
  getLocalIpAddress(): string {
    const nets = networkInterfaces();

    const ipv4Address = Object.values(nets)
      .flatMap((interfaces) => interfaces ?? [])
      .find((net) => net.family === 'IPv4' && !net.internal);

    return ipv4Address?.address ?? 'Unknown';
  }

  // Generate system status object
  getSystemStatus(connectedDriverCount: number): SystemStatus {
    return {
      mqttBroker: 'running',
      udpServer: 'active',
      eventReader: 'monitoring',
      driversConnected: connectedDriverCount,
      hubIp: this.getLocalIpAddress(),
    };
  }
}
