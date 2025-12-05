/**
 * Logger wrapper for event transformers
 *
 * Wraps electron-log to provide a consistent Logger interface for the
 * transformer system. This allows transformers to log without direct dependency
 * on electron-log, making testing easier.
 */

import type { Logger } from '../types/transformer-types';
import type ElectronLog from 'electron-log';

/**
 * Thin wrapper around electron-log that implements the Logger interface
 *
 * Delegates all logging calls to the underlying electron-log instance.
 */
export class LoggerWrapper implements Logger {
  constructor(private electronLog: typeof ElectronLog) {}

  /**
   * Log debug message (verbose, development only)
   */
  debug(message: string, ...args: unknown[]): void {
    this.electronLog.debug(message, ...args);
  }

  /**
   * Log informational message
   */
  info(message: string, ...args: unknown[]): void {
    this.electronLog.info(message, ...args);
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    this.electronLog.warn(message, ...args);
  }

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void {
    this.electronLog.error(message, ...args);
  }
}
