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
