/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { SystemError } from '../types';
import { eventBus } from './event-bus';

export interface SystemErrorTracker {
  readonly errors: readonly SystemError[];
  hasCriticalError(): boolean;
  addError(error: SystemError): void;
}

/**
 * Push an error to the array, capping at maxErrors (FIFO).
 */
function pushError(
  errors: SystemError[],
  error: SystemError,
  maxErrors: number,
): void {
  errors.push(error);

  if (errors.length > maxErrors) {
    errors.shift();
  }
}

/**
 * Creates a system error tracker that subscribes to the event bus
 * and manages system-wide error state.
 *
 * @param maxErrors Maximum number of errors to retain (FIFO)
 * @returns SystemErrorTracker instance
 */
export function createSystemErrorTracker(maxErrors: number): SystemErrorTracker {
  const errors: SystemError[] = [];

  // Subscribe to system errors from event bus
  eventBus.on('system:error', (error) => {
    pushError(errors, error, maxErrors);
  });

  return {
    get errors() {
      return errors;
    },

    hasCriticalError(): boolean {
      return errors.some((e) => e.errorType === 'config');
    },

    addError(error: SystemError): void {
      pushError(errors, error, maxErrors);
    },
  };
}
