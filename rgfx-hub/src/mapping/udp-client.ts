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
   * Broadcast effect to all connected drivers
   * @param payload Effect payload with semantic data
   * @returns true (for mapper return convenience)
   */
  broadcast(payload: EffectPayload): boolean {
    const drivers = this.driverRegistry
      .getAllDrivers()
      .filter((d) => d.connected && d.ip);

    log.info(`Broadcasting effect: ${JSON.stringify(payload)} to ${drivers.length} driver(s)`);

    for (const driver of drivers) {
      this.send(driver.id, payload);
    }

    return true;
  }

  /**
   * Send effect to a specific driver by ID
   * @param driverId Driver MAC address or ID
   * @param payload Effect payload
   * @returns true (for mapper return convenience)
   */
  send(driverId: string, payload: EffectPayload): boolean {
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

    udp.send(payload);
    return true;
  }

  /**
   * Send effect to multiple specific drivers
   * @param driverIds Array of driver IDs
   * @param payload Effect payload
   * @returns true (for mapper return convenience)
   */
  sendToDrivers(driverIds: string[], payload: EffectPayload): boolean {
    for (const driverId of driverIds) {
      this.send(driverId, payload);
    }
    return true;
  }
}
