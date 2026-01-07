/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/** Logger type compatible with electron-log/main default export */
export type ElectronLogger = typeof log;

/**
 * Initialize electron-log and configure log levels.
 * Log level can be set via LOG_LEVEL env var (default: 'info').
 *
 * @returns The configured electron-log instance
 */
export function initializeLogging(): typeof log {
  log.initialize();

  const logLevel = (process.env.LOG_LEVEL ?? 'info') as LogLevel;
  log.transports.console.level = logLevel;
  log.transports.file.level = logLevel;

  return log;
}
