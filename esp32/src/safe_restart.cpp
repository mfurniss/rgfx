#include "safe_restart.h"
#include <Arduino.h>
#include <FastLED.h>
#include "config/config_leds.h"
#include "config/constants.h"
#include "driver_config.h"
#include "log.h"
#include "network/network_init.h"

void safeRestart() {
	log("Safe restart: stopping all operations...");

	// Signal all tasks to stop processing
	pendingRestart = true;
	g_configUpdateInProgress = true;

	// Wait for in-progress operations to complete and both cores to check flags
	delay(SAFE_RESTART_CORE1_STOP_DELAY_MS);

	// Clear LEDs directly from Core 0 now that Core 1 is blocked
	// Only if FastLED has been initialized (avoids crash on fresh device without LED config)
	if (isFastLEDInitialized()) {
		log("Safe restart: clearing LEDs...");
		FastLED.clear(true);  // true = write to LEDs immediately
	}

	log("Safe restart: restarting device...");
	delay(500);
	ESP.restart();
}
