/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include <cstdint>

// AP mode timeout in milliseconds
// Controls how long device stays in AP mode before falling back to saved WiFi
// Also used for UI countdown display in main.cpp
static constexpr uint32_t AP_TIMEOUT_MS = 10000; // 10 seconds
