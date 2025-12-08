/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

/**
 * Tracks which drivers are currently receiving OTA firmware updates.
 * Used to prevent marking drivers as disconnected when their MQTT LWT
 * triggers during the OTA process (ESP32 disconnects from MQTT during OTA).
 */
const driversInOta = new Set<string>();

export function markDriverOtaStarted(driverId: string): void {
  driversInOta.add(driverId);
}

export function markDriverOtaFinished(driverId: string): void {
  driversInOta.delete(driverId);
}

export function isDriverInOta(driverId: string): boolean {
  return driversInOta.has(driverId);
}
