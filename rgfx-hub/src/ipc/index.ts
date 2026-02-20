/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { handlers } from './handler-registry';
import type { IpcHandlersDeps } from './handler-registry';

export function registerIpcHandlers(deps: IpcHandlersDeps): void {
  for (const register of handlers) {
    register(deps);
  }
}
