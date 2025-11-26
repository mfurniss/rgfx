/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

// Network task - runs on Core 0 (protocol core)
// Handles MQTT, web server, OTA, and OLED display updates
void networkTask(void* parameter);
