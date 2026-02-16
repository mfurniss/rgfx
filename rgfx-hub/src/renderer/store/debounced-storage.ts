/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { debounce } from 'lodash-es';
import type { StateStorage } from 'zustand/middleware';

/**
 * Wraps localStorage with a debounced setItem to batch rapid writes.
 * getItem and removeItem pass through immediately.
 */
export function createDebouncedStorage(delay = 500): StateStorage {
  const debouncedSetItem = debounce(
    (name: string, value: string) => {
      localStorage.setItem(name, value);
    },
    delay,
  );

  return {
    getItem: (name: string) => localStorage.getItem(name),
    setItem: (name: string, value: string) => {
      debouncedSetItem(name, value);
    },
    removeItem: (name: string) => {
      localStorage.removeItem(name);
    },
  };
}
