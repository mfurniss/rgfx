#include "config_leds.h"
#include "driver_config.h"
#include "hal/led_controller.h"
#include "log.h"
#include "network/mqtt.h"
#include <fl/rgbw.h>
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
 * Helper: Check if color order indicates RGBW (4-channel) LED
 */
static bool isRGBWColorOrder(const String& colorOrder) {
	return colorOrder.length() == 4 && colorOrder.indexOf('W') >= 0;
}

/**
 * Helper: Get white channel position from color order string
 * Returns EOrderW enum value (W0, W1, W2, W3) based on position of 'W' in the string
 */
static fl::EOrderW getWhitePosition(const String& colorOrder) {
	int pos = colorOrder.indexOf('W');
	if (pos < 0) return fl::W3;  // Default: white last
	switch (pos) {
		case 0: return fl::W0;
		case 1: return fl::W1;
		case 2: return fl::W2;
		case 3: return fl::W3;
		default: return fl::W3;
	}
}

/**
 * Helper: Get FastLED EOrder from color order string
 * Extracts RGB portion, ignoring W position
 */
static EOrder getColorOrder(const String& colorOrder) {
	// Build RGB-only string by removing W
	String rgbPart = "";
	for (size_t i = 0; i < colorOrder.length() && rgbPart.length() < 3; i++) {
		char c = colorOrder.charAt(i);
		if (c != 'W' && c != 'w') {
			rgbPart += c;
		}
	}

	if (rgbPart == "RGB") return RGB;
	if (rgbPart == "RBG") return RBG;
	if (rgbPart == "GRB") return GRB;
	if (rgbPart == "GBR") return GBR;
	if (rgbPart == "BRG") return BRG;
	if (rgbPart == "BGR") return BGR;

	// Default to GRB (most common for WS2812B)
	return GRB;
}

/**
 * Helper: Get FastLED RGBW_MODE from string
 * Returns the appropriate mode for RGB→RGBW color conversion
 */
static fl::RGBW_MODE getRGBWMode(const String& mode) {
	if (mode == "max_brightness") return fl::kRGBWMaxBrightness;
	return fl::kRGBWExactColors;  // Default
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
	// Also store the first device's settings for each pin
	std::map<uint8_t, uint16_t> pinLEDCounts;
	std::map<uint8_t, String> pinColorCorrection;
	std::map<uint8_t, String> pinChipset;
	std::map<uint8_t, String> pinColorOrder;
	std::map<uint8_t, String> pinRgbwMode;

	for (const auto& dev : g_driverConfig.devices) {
		uint16_t needed = dev.offset + dev.count;
		if (pinLEDCounts.find(dev.pin) == pinLEDCounts.end()) {
			pinLEDCounts[dev.pin] = needed;
			pinColorCorrection[dev.pin] = dev.colorCorrection;
			pinChipset[dev.pin] = dev.chipset.length() > 0 ? dev.chipset : "WS2812B";
			pinColorOrder[dev.pin] = dev.colorOrder.length() > 0 ? dev.colorOrder : "GRB";
			pinRgbwMode[dev.pin] = dev.rgbwMode.length() > 0 ? dev.rgbwMode : "exact";
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
		String chipset = pinChipset[pin];
		String colorOrder = pinColorOrder[pin];
		bool isRGBW = isRGBWColorOrder(colorOrder);

		log("Pin " + String(pin) + ": " + String(count) + " LEDs, chipset=" + chipset +
		    ", colorOrder=" + colorOrder + (isRGBW ? " (RGBW)" : ""));

		// Allocate CRGB buffer - FastLED handles RGBW internally via setRgbw()
		ledBuffers[pinIndex] = new CRGB[count];
		if (!ledBuffers[pinIndex]) {
			log("ERROR: Failed to allocate LED buffer for pin " + String(pin));
			return false;
		}

		ledCounts[pinIndex] = count;
		pinNumbers[pinIndex] = pin;

		// Initialize LEDs to black
		fill_solid(ledBuffers[pinIndex], count, CRGB::Black);

		// Get color correction and order for this pin
		uint32_t correction = getColorCorrection(pinColorCorrection[pin]);
		EOrder order = getColorOrder(colorOrder);

		// Get RGBW config if applicable
		fl::EOrderW wPos = isRGBW ? getWhitePosition(colorOrder) : fl::W3;
		fl::RGBW_MODE rgbwMode = getRGBWMode(pinRgbwMode[pin]);

		if (isRGBW) {
			log("  RGBW mode: " + pinRgbwMode[pin]);
		}

// Macro to add LEDs with setRgbw() for RGBW strips
#define ADD_LEDS_WITH_ORDER(CHIPSET, PIN_NUM, ORDER)                                            \
	do {                                                                                        \
		auto& controller = FastLED.addLeds<CHIPSET, PIN_NUM, ORDER>(ledBuffers[pinIndex], count); \
		controller.setCorrection(correction);                                                   \
		if (isRGBW) {                                                                           \
			controller.setRgbw(fl::Rgbw(fl::kRGBWDefaultColorTemp, rgbwMode, wPos));            \
		}                                                                                       \
	} while(0)

#define ADD_FASTLED_FOR_PIN_ORDER(PIN_NUM, ORDER)                                               \
	if (chipset == "WS2812B" || chipset == "WS2812" || chipset == "NEOPIXEL") {                 \
		ADD_LEDS_WITH_ORDER(WS2812B, PIN_NUM, ORDER);                                           \
	} else if (chipset == "WS2811") {                                                           \
		ADD_LEDS_WITH_ORDER(WS2811, PIN_NUM, ORDER);                                            \
	} else if (chipset == "WS2813") {                                                           \
		ADD_LEDS_WITH_ORDER(WS2813, PIN_NUM, ORDER);                                            \
	} else if (chipset == "WS2814" || chipset == "SK6812") {                                    \
		ADD_LEDS_WITH_ORDER(SK6812, PIN_NUM, ORDER); /* WS2814/SK6812 RGBW - needs SK6812 timing */  \
	} else if (chipset == "APA102" || chipset == "DOTSTAR") {                                   \
		ADD_LEDS_WITH_ORDER(WS2812B, PIN_NUM, ORDER); /* APA102 needs clock pin - fallback */   \
	} else {                                                                                    \
		ADD_LEDS_WITH_ORDER(WS2812B, PIN_NUM, ORDER); /* Default fallback */                    \
		log("WARNING: Unknown chipset '" + chipset + "', using WS2812B");                       \
	}

#define ADD_FASTLED_FOR_PIN(PIN_NUM)                                                            \
	case PIN_NUM:                                                                               \
		switch (order) {                                                                        \
			case RGB: ADD_FASTLED_FOR_PIN_ORDER(PIN_NUM, RGB); break;                           \
			case RBG: ADD_FASTLED_FOR_PIN_ORDER(PIN_NUM, RBG); break;                           \
			case GRB: ADD_FASTLED_FOR_PIN_ORDER(PIN_NUM, GRB); break;                           \
			case GBR: ADD_FASTLED_FOR_PIN_ORDER(PIN_NUM, GBR); break;                           \
			case BRG: ADD_FASTLED_FOR_PIN_ORDER(PIN_NUM, BRG); break;                           \
			case BGR: ADD_FASTLED_FOR_PIN_ORDER(PIN_NUM, BGR); break;                           \
			default:  ADD_FASTLED_FOR_PIN_ORDER(PIN_NUM, GRB); break;                           \
		}                                                                                       \
		log("Added FastLED for GPIO" #PIN_NUM);                                                 \
		break;

		switch (pin) {
#if CONFIG_IDF_TARGET_ESP32S3
			// ESP32-S3: GPIO 19/20 are USB, GPIO 22/23 don't exist
			ADD_FASTLED_FOR_PIN(1)
			ADD_FASTLED_FOR_PIN(2)
			ADD_FASTLED_FOR_PIN(3)
			ADD_FASTLED_FOR_PIN(4)
			ADD_FASTLED_FOR_PIN(5)
			ADD_FASTLED_FOR_PIN(6)
			ADD_FASTLED_FOR_PIN(7)
			ADD_FASTLED_FOR_PIN(8)
			ADD_FASTLED_FOR_PIN(9)
			ADD_FASTLED_FOR_PIN(10)
			ADD_FASTLED_FOR_PIN(11)
			ADD_FASTLED_FOR_PIN(12)
			ADD_FASTLED_FOR_PIN(13)
			ADD_FASTLED_FOR_PIN(14)
			ADD_FASTLED_FOR_PIN(15)
			ADD_FASTLED_FOR_PIN(16)
			ADD_FASTLED_FOR_PIN(17)
			ADD_FASTLED_FOR_PIN(18)
			ADD_FASTLED_FOR_PIN(21)
			default:
				String errorMsg = "GPIO pin " + String(pin) + " not configured (available: 1-18, 21)";
#else
			// ESP32 (original): Standard GPIO pins
			ADD_FASTLED_FOR_PIN(16)
			ADD_FASTLED_FOR_PIN(17)
			ADD_FASTLED_FOR_PIN(18)
			ADD_FASTLED_FOR_PIN(19)
			ADD_FASTLED_FOR_PIN(21)
			ADD_FASTLED_FOR_PIN(22)
			ADD_FASTLED_FOR_PIN(23)
			default:
				String errorMsg = "GPIO pin " + String(pin) + " not configured (available: 16, 17, 18, 19, 21, 22, 23)";
#endif
				log("ERROR: " + errorMsg);
				publishError("config", errorMsg.c_str());
				delete[] ledBuffers[pinIndex];
				ledBuffers[pinIndex] = nullptr;
				return false;
		}

#undef ADD_FASTLED_FOR_PIN
#undef ADD_FASTLED_FOR_PIN_ORDER
#undef ADD_LEDS_WITH_ORDER

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

		log("Mapped device: " + dev.id);
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
