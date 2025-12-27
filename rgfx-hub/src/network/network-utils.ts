/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { networkInterfaces } from 'node:os';
import log from 'electron-log/main';

interface NetworkInterface {
  name: string;
  address: string;
}

// Track last selected interface to avoid spammy logging
let lastSelectedInterface: string | null = null;

/**
 * Get the local IP address (IPv4, non-loopback, non-internal).
 * Prefers WiFi/Ethernet interfaces (en0, en1, eth0, etc.) over other interfaces.
 */
export function getLocalIP(): string {
  const nets = networkInterfaces();
  const candidates: NetworkInterface[] = [];

  // Collect all non-loopback IPv4 addresses
  for (const name of Object.keys(nets)) {
    const netInterfaces = nets[name];

    if (!netInterfaces) {
      continue;
    }

    for (const net of netInterfaces) {
      if (net.family === 'IPv4' && !net.internal) {
        candidates.push({ name, address: net.address });
      }
    }
  }

  // Prefer WiFi/Ethernet interfaces (en0, en1, eth0, etc.)
  const preferred = candidates.find(
    (c) => c.name.startsWith('en') || c.name.startsWith('eth'),
  );

  if (preferred) {
    if (lastSelectedInterface !== preferred.address) {
      log.info(
        `Detected network interfaces: ${candidates.map((c) => `${c.name}=${c.address}`).join(', ')}`,
      );
      log.info(`Selected interface ${preferred.name} with IP ${preferred.address}`);
      lastSelectedInterface = preferred.address;
    }
    return preferred.address;
  }

  // Fallback to first candidate or localhost
  if (candidates.length > 0) {
    if (lastSelectedInterface !== candidates[0].address) {
      log.info(
        `Detected network interfaces: ${candidates.map((c) => `${c.name}=${c.address}`).join(', ')}`,
      );
      log.info(
        `Using first available interface ${candidates[0].name} with IP ${candidates[0].address}`,
      );
      lastSelectedInterface = candidates[0].address;
    }
    return candidates[0].address;
  }

  if (lastSelectedInterface !== '127.0.0.1') {
    log.warn('No network interfaces found, using localhost');
    lastSelectedInterface = '127.0.0.1';
  }
  return '127.0.0.1';
}

/**
 * Calculate the broadcast address from a local IP.
 * Assumes a /24 subnet (255.255.255.0 netmask).
 * @example getBroadcastAddress('192.168.10.23') returns '192.168.10.255'
 */
export function getBroadcastAddress(localIP: string): string {
  return localIP.split('.').slice(0, 3).join('.') + '.255';
}
