/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { homedir } from 'os';
import { resolve } from 'path';

/**
 * Expands ~ to the user's home directory
 */
export function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return resolve(homedir(), path.slice(1).replace(/^\//, ''));
  }
  return path;
}
