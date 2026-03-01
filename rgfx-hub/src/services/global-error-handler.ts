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

// Track which drivers are currently being OTA updated (for error context)
const activeOtaDrivers = new Set<string>();
// Suppress socket errors during shutdown to prevent EPIPE flood
let shuttingDown = false;

export function addActiveOtaDriver(driverId: string): void {
  activeOtaDrivers.add(driverId);
}

export function removeActiveOtaDriver(driverId: string): void {
  activeOtaDrivers.delete(driverId);
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

  // ECONNRESET during OTA is expected — ESP32 devices stop MQTT keepalives
  // when entering OTA mode, causing the broker to see connection drops
  if (isSocketError && activeOtaDrivers.size > 0 && message.includes('ECONNRESET')) {
    log.warn(`${label} (suppressed during OTA):`, message);
    return;
  }

  if (isSocketError) {
    log.warn(`${label} (recovered):`, message);
    eventBus.emit('system:error', {
      errorType: 'network',
      message: `Socket error: ${message}`,
      timestamp: Date.now(),
      details: 'Network connection failed',
    } satisfies SystemError);
  } else {
    log.error(`${label}:`, raw);
    eventBus.emit('system:error', {
      errorType: 'general',
      message,
      timestamp: Date.now(),
      details: stack,
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
