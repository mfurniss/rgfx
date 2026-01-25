/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';

// Cache the module import and last logged IP to avoid spammy logging
let internalIpModule: { internalIpV4: () => Promise<string | undefined> } | null = null;
let lastLoggedIP: string | null = null;

async function getInternalIpModule() {
  internalIpModule ??= await import('internal-ip');
  return internalIpModule;
}

/**
 * Get the local IP address by determining the outbound network interface.
 * Uses the default gateway to find the correct interface.
 * This approach respects the OS routing table and works across all platforms.
 */
export async function getLocalIP(): Promise<string> {
  try {
    const { internalIpV4 } = await getInternalIpModule();
    const ip = await internalIpV4();

    if (ip) {
      if (ip !== lastLoggedIP) {
        log.info(`Detected local IP: ${ip}`);
        lastLoggedIP = ip;
      }
      return ip;
    }

    if (lastLoggedIP !== '127.0.0.1') {
      log.warn('internal-ip returned undefined, using localhost');
      lastLoggedIP = '127.0.0.1';
    }
    return '127.0.0.1';
  } catch (error) {
    if (lastLoggedIP !== '127.0.0.1') {
      log.warn('Failed to detect local IP, using localhost', error);
      lastLoggedIP = '127.0.0.1';
    }
    return '127.0.0.1';
  }
}

/**
 * Calculate the broadcast address from a local IP.
 * Assumes a /24 subnet (255.255.255.0 netmask).
 * @example getBroadcastAddress('192.168.10.23') returns '192.168.10.255'
 */
export function getBroadcastAddress(localIP: string): string {
  return localIP.split('.').slice(0, 3).join('.') + '.255';
}
