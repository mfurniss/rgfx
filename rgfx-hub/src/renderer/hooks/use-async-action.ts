/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { useState, useCallback } from 'react';

interface UseAsyncActionOptions {
  onError?: (error: unknown) => void;
}

interface UseAsyncActionReturn<T extends unknown[]> {
  execute: (...args: T) => void;
  pending: boolean;
}

/**
 * Hook to standardize the async-with-pending pattern used throughout the app.
 *
 * Wraps an async function with pending state management and error handling.
 *
 * @example
 * const { execute: restart, pending } = useAsyncAction(
 *   async (driverId: string) => {
 *     await window.rgfx.restartDriver(driverId);
 *   }
 * );
 *
 * <Button onClick={() => restart(driver.id)} disabled={pending}>
 *   {pending ? 'Restarting...' : 'Restart'}
 * </Button>
 */
export function useAsyncAction<T extends unknown[]>(
  action: (...args: T) => Promise<void>,
  options: UseAsyncActionOptions = {},
): UseAsyncActionReturn<T> {
  const [pending, setPending] = useState(false);

  const execute = useCallback(
    (...args: T) => {
      setPending(true);
      void (async () => {
        try {
          await action(...args);
        } catch (error) {
          if (options.onError) {
            options.onError(error);
          } else {
            console.error('Action failed:', error);
          }
        } finally {
          setPending(false);
        }
      })();
    },
    [action, options],
  );

  return { execute, pending };
}
