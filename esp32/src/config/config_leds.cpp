#include "config_leds.h"
#include "driver_config.h"
#include "hal/led_controller.h"
#include "log.h"
#include "network/mqtt.h"
#include <map>

// LED buffers for each pin
static CRGB* ledBuffers[MAX_PINS] = {nullptr, nullptr, nullptr, nullptr};
static uint16_t ledCounts[MAX_PINS] = {0, 0, 0, 0};
static uint8_t pinNumbers[MAX_PINS] = {0, 0, 0, 0};
static uint8_t activePins = 0;

// Device mapping
struct DeviceMapping {
	String id;
	uint8_t pinIndex;  // Index into ledBuffers array
	uint16_t offset;   // Offset within pin's LED buffer
	uint16_t count;    // Number of LEDs
};

static std::vector<DeviceMapping> deviceMappings;

// Track if FastLED has been initialized (addLeds can only be called once per pin)
static bool g_fastledInitialized = false;

/**
 * Helper: Find pin index for a GPIO pin number
 */
static int8_t findPinIndex(uint8_t pin) {
	for (uint8_t i = 0; i < activePins; i++) {
		if (pinNumbers[i] == pin) {
			return i;
		}
	}
	return -1;
}

/**
 * Helper: Convert color correction string to FastLED constant
 */
static uint32_t getColorCorrection(const String& correction) {
	if (correction == "Typical8mmPixel") {
		return Typical8mmPixel;
	} else if (correction == "UncorrectedColor") {
		return UncorrectedColor;
	}
	// Default to TypicalLEDStrip
	return TypicalLEDStrip;
}

/**
 * Initialize FastLED based on configuration
 * FastLED.addLeds() can only be called once per pin - subsequent calls corrupt RMT channels
 */
bool configLEDs() {
	// Skip if already initialized - FastLED doesn't support re-initialization
	if (g_fastledInitialized && activePins > 0) {
		log("FastLED already initialized, skipping re-initialization");
		return true;
	}

	log("Initializing FastLED configuration...");

	if (!g_configReceived) {
		log("ERROR: No configuration received from Hub");
		return false;
	}

	if (g_driverConfig.devices.empty()) {
		log("ERROR: No LED devices configured");
		return false;
	}

	// Clear existing setup
	hal::getLedController().clear(true);
	deviceMappings.clear();

	// Free existing LED buffers before reallocating
	for (uint8_t i = 0; i < activePins; i++) {
		if (ledBuffers[i]) {
			delete[] ledBuffers[i];
			ledBuffers[i] = nullptr;
		}
		ledCounts[i] = 0;
		pinNumbers[i] = 0;
	}
	activePins = 0;

	// Group devices by pin and calculate buffer sizes
	// Also store the first device's color correction for each pin
	std::map<uint8_t, uint16_t> pinLEDCounts;
	std::map<uint8_t, String> pinColorCorrection;

	for (const auto& dev : g_driverConfig.devices) {
		uint16_t needed = dev.offset + dev.count;
		if (pinLEDCounts.find(dev.pin) == pinLEDCounts.end()) {
			pinLEDCounts[dev.pin] = needed;
			pinColorCorrection[dev.pin] = dev.colorCorrection;
		} else {
			if (needed > pinLEDCounts[dev.pin]) {
				pinLEDCounts[dev.pin] = needed;
			}
		}
	}

	// Check pin count limit
	if (pinLEDCounts.size() > MAX_PINS) {
		String errorMsg = "Too many pins configured (" + String(pinLEDCounts.size()) + " > " + String(MAX_PINS) + ")";
		log("ERROR: " + errorMsg);
		publishError("config", errorMsg.c_str());
		return false;
	}

	log("Pins in use: " + String(pinLEDCounts.size()));

	// Allocate buffers and initialize FastLED for each pin
	uint8_t pinIndex = 0;
	for (const auto& pair : pinLEDCounts) {
		uint8_t pin = pair.first;
		uint16_t count = pair.second;

		log("Pin " + String(pin) + ": allocating " + String(count) + " LEDs");

		// Allocate buffer
		ledBuffers[pinIndex] = new CRGB[count];
		if (!ledBuffers[pinIndex]) {
			log("ERROR: Failed to allocate LED buffer for pin " + String(pin));
			return false;
		}

		ledCounts[pinIndex] = count;
		pinNumbers[pinIndex] = pin;

		// Initialize LEDs to black
		fill_solid(ledBuffers[pinIndex], count, CRGB::Black);

		// Get color correction for this pin
		uint32_t correction = getColorCorrection(pinColorCorrection[pin]);

// Add to FastLED - template requires compile-time pin specification
// Using macro to eliminate code duplication while maintaining template requirements
#define ADD_FASTLED_FOR_PIN(PIN_NUM)                                                            \
	case PIN_NUM:                                                                               \
		FastLED.addLeds<WS2812B, PIN_NUM, GRB>(ledBuffers[pinIndex], count)                    \
		    .setCorrection(correction);                                                         \
		log("Added FastLED for GPIO" #PIN_NUM " with " + pinColorCorrection[pin] +             \
		    " color correction");                                                               \
		break;

		switch (pin) {
			ADD_FASTLED_FOR_PIN(16)
			ADD_FASTLED_FOR_PIN(17)
			ADD_FASTLED_FOR_PIN(18)
			ADD_FASTLED_FOR_PIN(19)
			ADD_FASTLED_FOR_PIN(21)
			ADD_FASTLED_FOR_PIN(22)
			ADD_FASTLED_FOR_PIN(23)
			default:
				String errorMsg = "GPIO pin " + String(pin) + " not configured (available: 16, 17, 18, 19, 21, 22, 23)";
				log("ERROR: " + errorMsg);
				publishError("config", errorMsg.c_str());
				delete[] ledBuffers[pinIndex];
				ledBuffers[pinIndex] = nullptr;
				return false;
		}

#undef ADD_FASTLED_FOR_PIN

		pinIndex++;
	}

	activePins = pinIndex;

	// Create device mappings
	uint8_t mappingFailures = 0;
	for (const auto& dev : g_driverConfig.devices) {
		int8_t pIdx = findPinIndex(dev.pin);
		if (pIdx < 0) {
			String errorMsg = "Pin index not found for device " + dev.id + " (pin " + String(dev.pin) + ")";
			log("ERROR: " + errorMsg);
			publishError("config", errorMsg.c_str());
			mappingFailures++;
			continue;
		}

		DeviceMapping mapping;
		mapping.id = dev.id;
		mapping.pinIndex = pIdx;
		mapping.offset = dev.offset;
		mapping.count = dev.count;

		deviceMappings.push_back(mapping);

		log("Mapped device: " + dev.name + " (" + dev.id + ")");
		log("  -> Pin " + String(dev.pin) + " [" + String(dev.offset) + ".." +
		    String(dev.offset + dev.count - 1) + "]");
	}

	if (mappingFailures > 0) {
		log("ERROR: " + String(mappingFailures) + " device(s) failed to map");
		return false;
	}

	// Apply global settings
	uint8_t brightness = min((int)g_driverConfig.globalBrightnessLimit, 255);
	hal::getLedController().setBrightness(brightness);
	hal::getLedController().setMaxPower(g_driverConfig.powerSupplyVolts,
	                                    g_driverConfig.maxPowerMilliamps);

	// Apply dithering setting
	hal::getLedController().setDither(g_driverConfig.dithering);

	log("FastLED initialized successfully");
	log("Active pins: " + String(activePins));
	log("Device mappings: " + String(deviceMappings.size()));
	log("Global brightness: " + String(brightness));
	log("Power limit: " + String(g_driverConfig.powerSupplyVolts) + "V @ " +
	    String(g_driverConfig.maxPowerMilliamps) + "mA");
	log("Dithering: " + String(g_driverConfig.dithering ? "enabled" : "disabled"));

	g_fastledInitialized = true;
	return true;
}

/**
 * Check if FastLED has been initialized
 */
bool isFastLEDInitialized() {
	return g_fastledInitialized;
}

/**
 * Get LED array for a device
 */
CRGB* getLEDsForDevice(const String& deviceId) {
	for (const auto& mapping : deviceMappings) {
		if (mapping.id == deviceId) {
			return &ledBuffers[mapping.pinIndex][mapping.offset];
		}
	}
	return nullptr;
}

/**
 * Get LED count for a device
 */
uint16_t getLEDCountForDevice(const String& deviceId) {
	for (const auto& mapping : deviceMappings) {
		if (mapping.id == deviceId) {
			return mapping.count;
		}
	}
	return 0;
}

/**
 * Show all LEDs
 */
void showAllLEDs() {
	hal::getLedController().show();
}

/**
 * Clear all LEDs
 */
void clearAllLEDs() {
	for (uint8_t i = 0; i < activePins; i++) {
		if (ledBuffers[i]) {
			fill_solid(ledBuffers[i], ledCounts[i], CRGB::Black);
		}
	}
	hal::getLedController().show();
}
