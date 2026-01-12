/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { BrowserWindow } from 'electron';
import type { Driver } from '../types';
import type { DriverRegistry } from '../driver-registry';

/**
 * Driver with guaranteed MAC address
 */
type DriverWithMac = Driver & { mac: string };

/**
 * Gets a driver by ID and validates it has a MAC address.
 * Throws if driver not found or has no MAC address.
 */
export function requireDriverWithMac(
  driverId: string,
  driverRegistry: DriverRegistry,
): DriverWithMac {
  const driver = driverRegistry.getDriver(driverId);

  if (!driver) {
    throw new Error(`No driver found with ID ${driverId}`);
  }

  if (!driver.mac) {
    throw new Error(`Driver ${driverId} has no MAC address`);
  }

  return driver as DriverWithMac;
}

/**
 * Gets a driver by ID, validates it exists but doesn't require MAC.
 * Throws if driver not found.
 */
export function requireDriver(driverId: string, driverRegistry: DriverRegistry): Driver {
  const driver = driverRegistry.getDriver(driverId);

  if (!driver) {
    throw new Error(`No driver found with ID ${driverId}`);
  }

  return driver;
}

/**
 * Sends an IPC message to the renderer process if the window exists and isn't destroyed.
 * Gracefully handles "Render frame was disposed" errors during shutdown.
 */
export function sendToRenderer(
  getMainWindow: () => BrowserWindow | null,
  channel: string,
  ...args: unknown[]
): void {
  const mainWindow = getMainWindow();

  if (mainWindow !== null && !mainWindow.isDestroyed()) {
    // webContents can be destroyed even if window isn't (e.g., during renderer crash)
    if (mainWindow.webContents.isDestroyed()) {
      return;
    }

    try {
      mainWindow.webContents.send(channel, ...args);
    } catch (error) {
      // Ignore "Render frame was disposed" errors during shutdown
      if (error instanceof Error && error.message.includes('Render frame was disposed')) {
        return;
      }
      throw error;
    }
  }
}

/**
 * Extracts error message from unknown error type.
 * Returns the message if Error instance, otherwise stringifies.
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Builds an MQTT topic for a driver command.
 */
export function buildDriverTopic(mac: string, command: string): string {
  return `rgfx/driver/${mac}/${command}`;
}
