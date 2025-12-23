/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#pragma once

/**
 * Safely restart the ESP32 by first signaling Core 1 to clear effects.
 * This prevents corrupted LED state from mid-frame ESP.restart().
 */
void safeRestart();
