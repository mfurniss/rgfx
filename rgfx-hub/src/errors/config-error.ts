/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { ZodError } from 'zod';
import type { SystemError } from '../types';

/**
 * Format a Zod error into a human-readable message.
 * Zod v4 messages already include "expected X, received Y" info.
 * Example: 'Invalid input: expected string, received undefined at "id"'
 */
export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? ` at "${issue.path.join('.')}"` : '';
      // Make "received undefined" more user-friendly
      const message = issue.message.replace('received undefined', 'field is missing');
      return `${message}${path}`;
    })
    .join('; ');
}

/**
 * Error thrown when a configuration file cannot be parsed or validated.
 * Used for drivers.json and LED hardware definition files.
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly details?: string,
  ) {
    super(message);
    this.name = 'ConfigError';
  }

  toSystemError(): SystemError {
    return {
      errorType: 'config',
      message: this.message,
      filePath: this.filePath,
      details: this.details,
      timestamp: Date.now(),
    };
  }
}
