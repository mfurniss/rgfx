/**
 * UDP client wrapper for event mappers
 *
 * Provides high-level interface for broadcasting effects to LED drivers.
 * Uses DriverRegistry to discover connected drivers and their IP addresses.
 */

import log from 'electron-log/main';
import type { UdpClient, EffectPayload } from '../types/mapping-types';
import type { DriverRegistry } from '../driver-registry';
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

    // Get all connected drivers with IPs
    let drivers = this.driverRegistry.getAllDrivers().filter((d) => d.connected && d.ip);

    // Apply selective routing if specified
    if (targetDriverIds?.length) {
      // Filter drivers by sequential ID (e.g., "rgfx-driver-0001")
      drivers = drivers.filter((d) => targetDriverIds.includes(d.id));

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
   * Internal method to send effect data to a driver (without drivers property)
   * @param driverId Driver ID (last 3 bytes of MAC, e.g., "F8:9A:58")
   * @param effectData Effect payload without routing information
   * @returns true
   */
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
    return true;
  }

  /**
   * Send effect to a specific driver by ID
   * @param driverId Driver ID (last 3 bytes of MAC, e.g., "F8:9A:58")
   * @param payload Effect payload
   * @returns true (for mapper return convenience)
   */
  send(driverId: string, payload: EffectPayload): boolean {
    // Remove drivers property before sending
    const { drivers, ...effectData } = payload;
    void drivers; // Acknowledge but don't use
    return this.sendEffectToDriver(driverId, effectData);
  }

  /**
   * Send effect to multiple specific drivers
   * @param driverIds Array of driver IDs
   * @param payload Effect payload
   * @returns true (for mapper return convenience)
   */
  sendToDrivers(driverIds: string[], payload: EffectPayload): boolean {
    // Remove drivers property before sending
    const { drivers, ...effectData } = payload;
    void drivers; // Acknowledge but don't use
    for (const driverId of driverIds) {
      this.sendEffectToDriver(driverId, effectData);
    }
    return true;
  }
}
