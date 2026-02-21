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

// Track which driver is currently being OTA updated (for error context)
let activeOtaDriverId: string | undefined;
// Suppress socket errors during shutdown to prevent EPIPE flood
let shuttingDown = false;

export function setActiveOtaDriver(driverId: string): void {
  activeOtaDriverId = driverId;
}

export function clearActiveOtaDriver(): void {
  activeOtaDriverId = undefined;
}

export function setShuttingDown(): void {
  shuttingDown = true;
}


function handleError(
  log: Logger,
  label: string,
  message: string,
  stack: string | undefined,
  raw: unknown,
): void {
  const isSocketError = SOCKET_ERRORS.some((code) => message.includes(code));

  if (isSocketError && shuttingDown) {
    return;
  }

  if (isSocketError) {
    log.warn(`${label} (recovered):`, message);
    eventBus.emit('system:error', {
      errorType: 'network',
      message: activeOtaDriverId
        ? `OTA update failed: ${message}`
        : `Socket error: ${message}`,
      timestamp: Date.now(),
      details: activeOtaDriverId
        ? 'Connection to driver was lost during firmware update'
        : 'Network connection failed',
      driverId: activeOtaDriverId,
    } satisfies SystemError);
  } else {
    log.error(`${label}:`, raw);
    eventBus.emit('system:error', {
      errorType: 'general',
      message,
      timestamp: Date.now(),
      details: stack,
      driverId: activeOtaDriverId,
    } satisfies SystemError);
  }
}

/**
 * Registers global error handlers to prevent crashes from socket errors.
 * Socket errors during OTA updates are expected and should not crash the app.
 * All errors are emitted as SystemErrors for UI visibility.
 */
export function registerGlobalErrorHandlers(log: Logger): void {
  process.on('uncaughtException', (err: Error) => {
    handleError(log, 'Uncaught exception', err.message, err.stack, err);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    handleError(log, 'Unhandled rejection', message, stack, reason);
  });
}
