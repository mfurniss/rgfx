/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "crash_handler.h"
#include "log.h"
#include "network/mqtt.h"
#include <esp_system.h>
#include <Arduino.h>

// RTC memory survives crashes, watchdog resets, and software resets
// Only cleared on power-on reset
RTC_NOINIT_ATTR static uint32_t rtcCrashCount;
RTC_NOINIT_ATTR static uint32_t rtcLastUptime;
RTC_NOINIT_ATTR static uint32_t rtcMagic;  // Magic number to detect uninitialized memory

static const uint32_t RTC_MAGIC = 0xC8A5F001;  // Magic to detect uninitialized RTC memory

// Current session's crash info
static CrashInfo crashInfo = {0, 0, 0, false, false};

const char* getResetReasonString(uint32_t reason) {
	switch (reason) {
		case ESP_RST_POWERON:
			return "Power-on";
		case ESP_RST_SW:
			return "Software restart";
		case ESP_RST_PANIC:
			return "Exception/panic";
		case ESP_RST_INT_WDT:
			return "Interrupt watchdog";
		case ESP_RST_TASK_WDT:
			return "Task watchdog";
		case ESP_RST_WDT:
			return "Other watchdog";
		case ESP_RST_DEEPSLEEP:
			return "Deep sleep wake";
		case ESP_RST_BROWNOUT:
			return "Brownout";
		case ESP_RST_SDIO:
			return "SDIO reset";
		default:
			return "Unknown";
	}
}

static bool isCrashReason(esp_reset_reason_t reason) {
	switch (reason) {
		case ESP_RST_PANIC:
		case ESP_RST_INT_WDT:
		case ESP_RST_TASK_WDT:
		case ESP_RST_WDT:
		case ESP_RST_BROWNOUT:
			return true;
		default:
			return false;
	}
}

void initCrashHandler() {
	esp_reset_reason_t reason = esp_reset_reason();

	// Check if RTC memory is initialized (magic number valid)
	bool rtcValid = (rtcMagic == RTC_MAGIC);

	// Power-on reset: initialize everything
	if (reason == ESP_RST_POWERON || !rtcValid) {
		rtcCrashCount = 0;
		rtcLastUptime = 0;
		rtcMagic = RTC_MAGIC;

		crashInfo.crashCount = 0;
		crashInfo.lastResetReason = reason;
		crashInfo.uptimeAtCrash = 0;
		crashInfo.crashDetected = false;
		crashInfo.crashReported = false;

		log("Clean boot - reset reason: " + String(getResetReasonString(reason)));
		return;
	}

	// Check if this was a crash
	if (isCrashReason(reason)) {
		rtcCrashCount++;

		crashInfo.crashCount = rtcCrashCount;
		crashInfo.lastResetReason = reason;
		crashInfo.uptimeAtCrash = rtcLastUptime;
		crashInfo.crashDetected = true;
		crashInfo.crashReported = false;

		log("CRASH DETECTED - reason: " + String(getResetReasonString(reason)), LogLevel::ERROR);
		log("Crash count since power-on: " + String(rtcCrashCount), LogLevel::ERROR);
		log("Uptime before crash: " + String(rtcLastUptime) + "ms", LogLevel::ERROR);
	} else {
		// Normal restart (software reset, etc.)
		crashInfo.crashCount = rtcCrashCount;
		crashInfo.lastResetReason = reason;
		crashInfo.uptimeAtCrash = 0;
		crashInfo.crashDetected = false;
		crashInfo.crashReported = false;

		log("Boot - reset reason: " + String(getResetReasonString(reason)));
		if (rtcCrashCount > 0) {
			log("Previous crash count: " + String(rtcCrashCount));
		}
	}
}

const CrashInfo& getCrashInfo() {
	return crashInfo;
}

bool hasPendingCrashReport() {
	return crashInfo.crashDetected && !crashInfo.crashReported;
}

void markCrashReported() {
	crashInfo.crashReported = true;
}

void updateCrashUptime() {
	rtcLastUptime = millis();
}

void publishCrashReport() {
	if (!hasPendingCrashReport()) {
		return;
	}

	if (!mqttClient.connected()) {
		return;
	}

	// Send crash info via the regular log system (Hub subscribes to /log topic)
	log("CRASH RECOVERY - reason: " + String(getResetReasonString(crashInfo.lastResetReason)) +
		", count: " + String(crashInfo.crashCount) +
		", uptime before crash: " + String(crashInfo.uptimeAtCrash) + "ms",
		LogLevel::ERROR);

	markCrashReported();
}
