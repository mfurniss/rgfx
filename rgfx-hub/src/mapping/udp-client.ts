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
    let drivers = this.driverRegistry
      .getAllDrivers()
      .filter((d) => d.connected && d.ip);

    // Apply selective routing if specified
    if (targetDriverIds?.length) {
      // Debug: Log all driver IDs and target IDs for comparison
      log.info(`[SELECTIVE ROUTING DEBUG] ========================================`);
      log.info(`[SELECTIVE ROUTING] Available drivers (${drivers.length}):`);
      drivers.forEach(d => {
        log.info(`  - ID: "${d.id}" (length: ${d.id.length}, IP: ${d.ip})`);
      });
      log.info(`[SELECTIVE ROUTING] Target driver IDs requested (${targetDriverIds.length}):`);
      targetDriverIds.forEach(id => {
        log.info(`  - Target: "${id}" (length: ${id.length})`);
      });

      // Filter drivers - support both full MAC and last 3 bytes formats
      const beforeCount = drivers.length;
      drivers = drivers.filter(d => {
        // Check if driver matches any target ID
        // Support both full MAC (44:1D:64:F8:9A:58) and short form (F8:9A:58)
        const matches = targetDriverIds.some(targetId => {
          // Direct match (full MAC)
          if (d.id === targetId) {
            log.info(`  - Driver "${d.id}" MATCHES target "${targetId}" (exact match)`);
            return true;
          }

          // Check if target is short form (last 3 bytes) matching end of full MAC
          const targetUpper = targetId.toUpperCase();
          const driverUpper = d.id.toUpperCase();
          if (driverUpper.endsWith(targetUpper) && targetId.includes(':')) {
            log.info(`  - Driver "${d.id}" MATCHES target "${targetId}" (short form match)`);
            return true;
          }

          return false;
        });

        if (!matches) {
          log.info(`  - Driver "${d.id}" does NOT match any target`);
        }
        return matches;
      });

      log.info(`[SELECTIVE ROUTING] Result: ${drivers.length} of ${beforeCount} drivers matched`);
      log.info(`[SELECTIVE ROUTING] Effect being sent: ${JSON.stringify(effectData)}`);

      if (drivers.length === 0) {
        log.warn(`[SELECTIVE ROUTING WARNING] No drivers matched! Double-check ID format and case.`);
        log.warn(`[SELECTIVE ROUTING] Expected format: Full MAC like "AA:BB:CC:DD:EE:FF" or last 3 bytes like "DD:EE:FF"`);
      }
      log.info(`[SELECTIVE ROUTING DEBUG] ========================================`);
    } else {
      log.info(`Broadcasting effect to all ${drivers.length} connected driver(s): ${JSON.stringify(effectData)}`);
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
