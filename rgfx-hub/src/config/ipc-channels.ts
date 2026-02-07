/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

/**
 * IPC push channels (main → renderer).
 * Defined once here to prevent string typos across preload, callbacks, and senders.
 */
export const IPC = {
  DRIVER_CONNECTED: 'driver:connected',
  DRIVER_DISCONNECTED: 'driver:disconnected',
  DRIVER_UPDATED: 'driver:updated',
  DRIVER_RESTARTING: 'driver:restarting',
  DRIVER_DELETED: 'driver:deleted',
  SYSTEM_STATUS: 'system:status',
  FLASH_OTA_STATE: 'flash:ota:state',
  FLASH_OTA_PROGRESS: 'flash:ota:progress',
  FLASH_OTA_ERROR: 'flash:ota:error',
  EVENT_RECEIVED: 'event:received',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
