/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { EventEmitter } from 'node:events';

/**
 * Type-safe event payloads. Add new events here.
 */
interface AppEventMap {
  'network:error': { code: string };
}

type AppEventName = keyof AppEventMap;

/**
 * Type-safe global event bus for decoupled component communication.
 * Enforces event names and payload types at compile time.
 */
class TypedEventBus {
  private emitter = new EventEmitter();

  emit<K extends AppEventName>(event: K, payload: AppEventMap[K]): void {
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
