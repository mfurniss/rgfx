/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import ip from 'ip';
import log from 'electron-log/main';

let lastLoggedIP: string | null = null;

/**
 * Get the local IP address.
 */
export function getLocalIP(): string {
  const addr = ip.address();

  if (addr !== lastLoggedIP) {
    log.info(`Detected local IP: ${addr}`);
    lastLoggedIP = addr;
  }

  return addr;
}

/**
 * Calculate the broadcast address from a local IP.
 * Assumes a /24 subnet (255.255.255.0 netmask).
 * @example getBroadcastAddress('192.168.10.23') returns '192.168.10.255'
 */
export function getBroadcastAddress(localIP: string): string {
  return localIP.split('.').slice(0, 3).join('.') + '.255';
}
