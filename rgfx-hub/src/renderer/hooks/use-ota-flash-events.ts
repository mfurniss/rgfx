/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { useEffect } from 'react';
import type { DriverFlashStatus } from '../store/ui-store';

interface OtaFlashEventHandlers {
  addLog: (message: string) => void;
  setDriverFlashStatus: React.Dispatch<React.SetStateAction<Map<string, DriverFlashStatus>>>;
}

/**
 * Hook that subscribes to OTA flash events from the main process.
 *
 * Handles:
 * - State changes (starting, verifying, etc.)
 * - Progress updates per driver
 * - Error events per driver
 *
 * Automatically cleans up subscriptions on unmount.
 */
export function useOtaFlashEvents(handlers: OtaFlashEventHandlers): void {
  const { addLog, setDriverFlashStatus } = handlers;

  useEffect(() => {
    const unsubscribeState = window.rgfx.onFlashOtaState(
      ({ driverId, state }: { driverId: string; state: string }): void => {
        addLog(`[${driverId}] OTA state: ${state}`);
      },
    );

    const unsubscribeProgress = window.rgfx.onFlashOtaProgress(
      (progressData: {
        driverId: string;
        sent: number;
        total: number;
        percent: number;
      }): void => {
        const { driverId, percent, sent, total } = progressData;

        setDriverFlashStatus((prev) => {
          const next = new Map(prev);
          const current = next.get(driverId);

          if (current) {
            next.set(driverId, { ...current, progress: percent, status: 'flashing' });
          }
          return next;
        });
        addLog(`[${driverId}] OTA progress: ${percent}% (${sent}/${total} bytes)`);
      },
    );

    const unsubscribeError = window.rgfx.onFlashOtaError(
      ({ driverId, error }: { driverId: string; error: string }): void => {
        addLog(`[${driverId}] OTA error: ${error}`);
        setDriverFlashStatus((prev) => {
          const next = new Map(prev);
          const current = next.get(driverId);

          if (current) {
            next.set(driverId, { ...current, status: 'error', error });
          }
          return next;
        });
      },
    );

    return (): void => {
      unsubscribeState();
      unsubscribeProgress();
      unsubscribeError();
    };
  }, [addLog, setDriverFlashStatus]);
}
