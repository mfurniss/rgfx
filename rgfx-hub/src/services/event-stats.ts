/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

export interface EventStats {
  getCount(): number;
  increment(): void;
  reset(): void;
}

/**
 * Creates an event statistics tracker for counting processed events.
 */
export function createEventStats(): EventStats {
  let count = 0;

  return {
    getCount: () => count,

    increment(): void {
      count++;
    },

    reset(): void {
      count = 0;
    },
  };
}
