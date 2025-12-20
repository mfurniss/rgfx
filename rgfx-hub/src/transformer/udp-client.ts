/**
 * UDP client wrapper for event transformers
 *
 * Provides high-level interface for broadcasting effects to LED drivers.
 * Uses DriverRegistry to discover connected drivers and their IP addresses.
 * Maintains a single reusable UDP socket for efficient message sending.
 */

import dgram from 'dgram';
import log from 'electron-log/main';
import type { UdpClient, EffectPayload } from '../types/transformer-types';
import type { DriverRegistry } from '../driver-registry';
import { type Driver } from '../types';
import { UDP_PORT } from '../config/constants';

/**
 * UDP client implementation for broadcasting effects to drivers
 *
 * Maintains a single reusable UDP socket and broadcasts
 * semantic effect payloads as JSON to connected drivers.
 */
export class UdpClientImpl implements UdpClient {
  private socket: dgram.Socket;

  constructor(private driverRegistry: DriverRegistry) {
    this.socket = dgram.createSocket('udp4');
    this.socket.on('error', (err) => {
      log.error(`UDP client socket error: ${err.message}`);
    });
    log.debug('UDP client socket initialized');
  }

  /**
   * Broadcast effect to all connected drivers or selective drivers if specified
   * @param payload Effect payload with semantic data and optional driver targeting
   * @returns true (for mapper return convenience)
   */
  broadcast(payload: EffectPayload): boolean {
    // Extract drivers property for routing, don't send it in UDP payload
    const { drivers: targetDriverIds, ...effectData } = payload;

    // Get all connected drivers, excluding disabled ones
    let drivers = this.driverRegistry.getConnectedDrivers().filter((d) => !d.disabled);

    // Apply selective routing if specified
    if (targetDriverIds?.length) {
      // Resolve '*' wildcards to actual driver IDs
      const resolvedIds = this.resolveRandomDrivers(targetDriverIds, drivers);

      // Filter drivers by resolved IDs
      drivers = drivers.filter(({ id }) => resolvedIds.includes(id));

      if (drivers.length === 0) {
        log.debug(`No drivers matched selective routing targets: ${targetDriverIds.join(', ')}`);
      }
    }

    // Pre-serialize JSON once for all drivers (avoid repeated stringify)
    const buffer = Buffer.from(JSON.stringify(effectData));

    for (const driver of drivers) {
      this.sendBufferToDriver(driver, buffer);
    }

    return true;
  }

  /**
   * Resolve wildcards in target IDs to actual random driver IDs
   * Wildcards: '*' = any driver, '*S' = strip driver, '*M' = matrix driver
   * - Typed wildcards (*S, *M) are resolved first to ensure they get matching drivers
   * - Each wildcard picks a unique random driver from the appropriate pool
   * - Named drivers are excluded from the random pool
   */
  private resolveRandomDrivers(targetIds: string[], connectedDrivers: Driver[]): string[] {
    const namedIds: string[] = [];
    let stripCount = 0;
    let matrixCount = 0;
    let anyCount = 0;

    for (const id of targetIds) {
      if (id === '*S') {
        stripCount++;
      } else if (id === '*M') {
        matrixCount++;
      } else if (id === '*') {
        anyCount++;
      } else {
        namedIds.push(id);
      }
    }

    if (stripCount === 0 && matrixCount === 0 && anyCount === 0) {
      return namedIds;
    }

    // Build pool excluding named drivers
    const availableDrivers = connectedDrivers.filter((d) => !namedIds.includes(d.id));
    const selectedIds = [...namedIds];

    // Helper to pick random drivers from a filtered pool
    const pickRandom = (pool: Driver[], count: number): void => {
      const poolCopy = [...pool];

      for (let i = 0; i < count && poolCopy.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * poolCopy.length);
        const picked = poolCopy.splice(randomIndex, 1)[0];
        selectedIds.push(picked.id);
      }
    };

    // Track which drivers have been selected to avoid duplicates
    const remainingPool = [...availableDrivers];

    const removeFromPool = (id: string) => {
      const idx = remainingPool.findIndex((d) => d.id === id);

      if (idx >= 0) {
        remainingPool.splice(idx, 1);
      }
    };

    // Resolve *S (strip) wildcards first
    if (stripCount > 0) {
      const stripPool = remainingPool.filter((d) => d.resolvedHardware?.layout === 'strip');
      const beforeCount = selectedIds.length;
      pickRandom(stripPool, stripCount);

      // Remove picked drivers from remaining pool
      for (let i = beforeCount; i < selectedIds.length; i++) {
        removeFromPool(selectedIds[i]);
      }
    }

    // Resolve *M (matrix) wildcards second
    if (matrixCount > 0) {
      const matrixPool = remainingPool.filter(
        (d) => d.resolvedHardware?.layout.startsWith('matrix-') ?? false,
      );
      const beforeCount = selectedIds.length;
      pickRandom(matrixPool, matrixCount);

      // Remove picked drivers from remaining pool
      for (let i = beforeCount; i < selectedIds.length; i++) {
        removeFromPool(selectedIds[i]);
      }
    }

    // Resolve * (any) wildcards last from remaining pool
    if (anyCount > 0) {
      pickRandom(remainingPool, anyCount);
    }

    return selectedIds;
  }

  /**
   * Send pre-serialized buffer to a driver (used by broadcast for efficiency)
   */
  private sendBufferToDriver(driver: Driver, buffer: Buffer): void {
    if (!driver.ip) {
      return;
    }

    this.socket.send(buffer, UDP_PORT, driver.ip, (err) => {
      if (err) {
        log.error(`UDP send to ${driver.ip} failed: ${err.message}`);
      } else {
        log.debug(`Sent effect to driver ${driver.id} (${driver.ip})`);
      }
    });
  }

  /**
   * Stop the UDP client and close the socket
   */
  stop(): void {
    this.socket.close();
    log.debug('UDP client socket closed');
  }
}
