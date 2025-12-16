/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { initTRPC } from '@trpc/server';
import { eventBus, type AppEventMap } from '../services/event-bus';
import {
  serializeDriverForIPC,
  type DisconnectReason,
} from '../types';

const t = initTRPC.create();

type SerializedDriver = ReturnType<typeof serializeDriverForIPC>;

interface DisconnectPayload {
  driver: SerializedDriver;
  reason: DisconnectReason;
}

/**
 * Creates an async generator that yields events from the event bus.
 * Properly handles cleanup when the subscription ends.
 */
function createEventGenerator<K extends keyof AppEventMap>(
  eventName: K,
): () => AsyncGenerator<AppEventMap[K], void, unknown> {
  return async function* () {
    const queue: AppEventMap[K][] = [];
    let resolve: (() => void) | null = null;

    const handler = (payload: AppEventMap[K]) => {
      queue.push(payload);

      if (resolve) {
        resolve();
        resolve = null;
      }
    };

    eventBus.on(eventName, handler);

    try {
      for (;;) {
        const item = queue.shift();

        if (item !== undefined) {
          yield item;
        } else {
          await new Promise<void>((r) => {
            resolve = r;
          });
        }
      }
    } finally {
      eventBus.off(eventName, handler);
    }
  };
}

/**
 * tRPC router for cross-process communication.
 * Provides subscriptions for real-time events from the main process.
 */
export const appRouter = t.router({
  /**
   * Subscribe to driver connection events.
   * Emits serialized driver data when a new driver connects.
   */
  onDriverConnected: t.procedure.subscription(async function* () {
    const generator = createEventGenerator('driver:connected');

    for await (const { driver } of generator()) {
      yield serializeDriverForIPC(driver);
    }
  }),

  /**
   * Subscribe to driver disconnection events.
   * Emits serialized driver data and disconnect reason.
   */
  onDriverDisconnected: t.procedure.subscription(async function* () {
    const generator = createEventGenerator('driver:disconnected');

    for await (const { driver, reason } of generator()) {
      const payload: DisconnectPayload = {
        driver: serializeDriverForIPC(driver),
        reason,
      };
      yield payload;
    }
  }),

  /**
   * Subscribe to driver update events.
   * Emits serialized driver data when driver stats or state changes.
   */
  onDriverUpdated: t.procedure.subscription(async function* () {
    const generator = createEventGenerator('driver:updated');

    for await (const { driver } of generator()) {
      yield serializeDriverForIPC(driver);
    }
  }),

  /**
   * Subscribe to system status updates.
   * Emits system status when it changes.
   */
  onSystemStatus: t.procedure.subscription(async function* () {
    const generator = createEventGenerator('system:status');

    for await (const status of generator()) {
      yield status;
    }
  }),
});

export type AppRouter = typeof appRouter;
