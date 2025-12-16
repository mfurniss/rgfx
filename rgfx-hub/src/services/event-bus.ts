/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { EventEmitter } from 'node:events';
import log from 'electron-log/main';
import type { Driver, DisconnectReason, SystemStatus } from '../types';
import { EVENT_BUS_LOGGING } from '../config/constants';

/**
 * Type-safe event payloads. Add new events here.
 */
export interface AppEventMap {
  'network:error': { code: string };

  // Driver lifecycle events
  'driver:connected': { driver: Driver };
  'driver:disconnected': { driver: Driver; reason: DisconnectReason };
  'driver:updated': { driver: Driver };

  // System events
  'system:status': SystemStatus;

  // Game event statistics
  'event:topic': { topic: string; count: number; lastValue?: string };

  // OTA flash events
  'flash:ota:state': { driverId: string; state: string };
  'flash:ota:progress': { driverId: string; sent: number; total: number; percent: number };
  'flash:ota:error': { driverId: string; error: string };
}

type AppEventName = keyof AppEventMap;

/**
 * Type-safe global event bus for decoupled component communication.
 * Enforces event names and payload types at compile time.
 */
class TypedEventBus {
  private emitter = new EventEmitter();

  emit<K extends AppEventName>(event: K, payload: AppEventMap[K]): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (EVENT_BUS_LOGGING) {
      log.info('[EventBus]', event, payload);
    }
    this.emitter.emit(event, payload);
  }

  on<K extends AppEventName>(event: K, handler: (payload: AppEventMap[K]) => void): void {
    this.emitter.on(event, handler);
  }

  off<K extends AppEventName>(event: K, handler: (payload: AppEventMap[K]) => void): void {
    this.emitter.off(event, handler);
  }
}

export const eventBus = new TypedEventBus();
