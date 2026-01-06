/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { Logger } from './service-factory';
import type { SystemError } from '../types';
import { eventBus } from './event-bus';

// Socket errors that are recoverable and should not crash the app
const SOCKET_ERRORS = [
  'ECONNRESET',
  'EPIPE',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENETUNREACH',
];

/**
 * Registers global error handlers to prevent crashes from socket errors.
 * Socket errors during OTA updates are expected and should not crash the app.
 * All errors are emitted as SystemErrors for UI visibility.
 */
export function registerGlobalErrorHandlers(log: Logger): void {
  process.on('uncaughtException', (err: Error) => {
    const isSocketError = SOCKET_ERRORS.some((code) => err.message.includes(code));

    if (isSocketError) {
      log.warn('Socket error (recovered):', err.message);
      const systemError: SystemError = {
        errorType: 'network',
        message: `Socket error: ${err.message}`,
        timestamp: Date.now(),
        details: 'OTA update connection failed - driver may be unreachable',
      };
      eventBus.emit('system:error', systemError);
    } else {
      log.error('Uncaught exception:', err);
      const systemError: SystemError = {
        errorType: 'general',
        message: err.message,
        timestamp: Date.now(),
        details: err.stack,
      };
      eventBus.emit('system:error', systemError);
    }
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    const isSocketError = SOCKET_ERRORS.some((code) => message.includes(code));

    if (isSocketError) {
      log.warn('Unhandled rejection (recovered):', message);
      const systemError: SystemError = {
        errorType: 'network',
        message: `Socket error: ${message}`,
        timestamp: Date.now(),
        details: 'OTA update connection failed - driver may be unreachable',
      };
      eventBus.emit('system:error', systemError);
    } else {
      log.error('Unhandled rejection:', reason);
      const systemError: SystemError = {
        errorType: 'general',
        message,
        timestamp: Date.now(),
        details: stack,
      };
      eventBus.emit('system:error', systemError);
    }
  });
}
