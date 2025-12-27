/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

/**
 * File system paths that depend on Node.js APIs.
 * This file must ONLY be imported from main process code, not renderer.
 */

import { homedir } from 'os';
import { join } from 'path';

/** Base directory for configuration files (user's home directory) */
export const CONFIG_DIRECTORY = join(homedir(), '.rgfx');

/** Directory for user transformers (event → effect mappings) */
export const TRANSFORMERS_DIRECTORY = join(CONFIG_DIRECTORY, 'transformers');

/** Directory for user interceptors (MAME game scripts) */
export const INTERCEPTORS_DIRECTORY = join(CONFIG_DIRECTORY, 'interceptors');

/** Directory for LED hardware definitions */
export const LED_HARDWARE_DIRECTORY = join(CONFIG_DIRECTORY, 'led-hardware');
