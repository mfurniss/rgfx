/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log/main';

/**
 * Manages persistent driver log files
 *
 * Writes driver logs to per-driver files in ~/.rgfx/logs/
 * Format: [ISO timestamp] [LEVEL] message
 */
export class DriverLogPersistence {
  private logsDir: string;

  constructor(baseDir: string) {
    this.logsDir = path.resolve(baseDir, 'logs');
  }

  /**
   * Ensure logs directory exists (lazy creation on first write)
   */
  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      log.info(`Created driver logs directory: ${this.logsDir}`);
    }
  }

  /**
   * Append a log entry to a driver's log file
   *
   * @param driverId - The driver ID (e.g., "rgfx-driver-0001")
   * @param level - Log level ("info" or "error")
   * @param message - The log message
   * @param timestamp - Unix timestamp in milliseconds from the driver
   */
  appendLog(driverId: string, level: string, message: string, timestamp: number): void {
    this.ensureLogsDirectory();

    const logFile = path.join(this.logsDir, `${driverId}.log`);
    const isoTimestamp = new Date(timestamp).toISOString();
    const levelUpper = level.toUpperCase();
    const logLine = `[${isoTimestamp}] [${levelUpper}] ${message}\n`;

    try {
      fs.appendFileSync(logFile, logLine, 'utf8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Failed to write driver log for ${driverId}: ${errorMessage}`);
    }
  }

  /**
   * Get the path to a driver's log file
   */
  getLogFilePath(driverId: string): string {
    return path.join(this.logsDir, `${driverId}.log`);
  }
}
