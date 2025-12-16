/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../trpc/router';

/**
 * tRPC React hooks for type-safe API calls.
 * Use this to subscribe to real-time events from the main process.
 *
 * @example
 * ```tsx
 * import { trpc } from '../trpc';
 *
 * function MyComponent() {
 *   // Subscribe to driver connection events
 *   trpc.onDriverConnected.useSubscription(undefined, {
 *     onData: (driver) => {
 *       console.log('Driver connected:', driver);
 *     },
 *   });
 * }
 * ```
 */
export const trpc = createTRPCReact<AppRouter>();
