/**
 * UDP client wrapper for event mappers
 *
 * Provides high-level interface for broadcasting effects to LED drivers.
 * Uses DriverRegistry to discover connected drivers and their IP addresses.
 */

import log from 'electron-log/main';
import type { UdpClient, EffectPayload } from '../types/mapping-types';
import type { DriverRegistry } from '../driver-registry';
import { type Driver } from '../types';
import { Udp } from '../udp';
import { UDP_PORT } from '../config/constants';

/**
 * UDP client implementation for broadcasting effects to drivers
 *
 * Creates UDP sockets on-demand for each driver and broadcasts
 * semantic effect payloads as JSON.
 */
export class UdpClientImpl implements UdpClient {
  constructor(private driverRegistry: DriverRegistry) {}

  /**
   * Broadcast effect to all connected drivers or selective drivers if specified
   * @param payload Effect payload with semantic data and optional driver targeting
   * @returns true (for mapper return convenience)
   */
  broadcast(payload: EffectPayload): boolean {
    // Extract drivers property for routing, don't send it in UDP payload
    const { drivers: targetDriverIds, ...effectData } = payload;

    // Get all connected drivers
    let drivers = this.driverRegistry.getConnectedDrivers();

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

    for (const driver of drivers) {
      this.sendEffectToDriver(driver.id, effectData);
    }

    return true;
  }

  /**
   * Resolve '*' wildcards in target IDs to actual random driver IDs
   * - Each '*' picks a unique random driver from the pool
   * - Named drivers are excluded from the random pool
   */
  private resolveRandomDrivers(targetIds: string[], connectedDrivers: Driver[]): string[] {
    const namedIds = targetIds.filter((id) => id !== '*');
    const randomCount = targetIds.length - namedIds.length;

    if (randomCount === 0) {
      return namedIds;
    }

    // Build pool excluding named drivers
    const availablePool = connectedDrivers.map((d) => d.id).filter((id) => !namedIds.includes(id));

    // Pick unique random drivers from pool
    const randomIds: string[] = [];
    const poolCopy = [...availablePool];

    for (let i = 0; i < randomCount && poolCopy.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * poolCopy.length);
      randomIds.push(poolCopy.splice(randomIndex, 1)[0]);
    }

    return [...namedIds, ...randomIds];
  }

  private sendEffectToDriver(driverId: string, effectData: EffectPayload): boolean {
    const driver = this.driverRegistry.getDriver(driverId);

    if (!driver?.ip) {
      return true; // Still return true for mapper convenience
    }

    // Create UDP socket and send
    const udp = new Udp(driver.ip, UDP_PORT);

    // Set callback to close socket after send completes
    udp.setSentCallback(() => {
      udp.stop();
    });

    // Set error callback to close socket on error
    udp.setErrorCallback(() => {
      udp.stop();
    });

    udp.send(effectData);

    log.info(`Sent effect to driver ${driverId} (${driver.ip}):`, effectData);

    return true;
  }
}
