/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once
#include <cstdint>

struct CrashInfo {
	uint32_t crashCount;       // Total crashes since power-on
	uint32_t lastResetReason;  // esp_reset_reason_t value
	uint32_t uptimeAtCrash;    // millis() before crash (approximate)
	bool crashDetected;        // True if this boot recovered from a crash
	bool crashReported;        // True if crash has been sent via MQTT
};

// Initialize crash handler - call early in setup() before anything that might crash
void initCrashHandler();

// Get crash info for telemetry/reporting
const CrashInfo& getCrashInfo();

// Get human-readable string for reset reason
const char* getResetReasonString(uint32_t reason);

// Check if a crash was detected this boot (and not yet reported)
bool hasPendingCrashReport();

// Mark crash as reported (called after MQTT publish succeeds)
void markCrashReported();

// Publish crash report via MQTT - call immediately after MQTT connects
void publishCrashReport();

// Update uptime tracker (call periodically so we know uptime at crash)
void updateCrashUptime();
