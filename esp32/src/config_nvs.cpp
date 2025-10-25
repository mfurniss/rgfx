#include "config_nvs.h"
#include "log.h"
#include <Preferences.h>
#include <EEPROM.h>

// Static Preferences instance for NVS operations
static Preferences prefs;

void ConfigNVS::begin() {
	log("Initializing NVS configuration...");

	// Check if migration needed
	if (!hasMigrated()) {
		log("First boot detected - migrating from EEPROM to NVS");
		migrateFromEEPROM();
	} else {
		log("NVS already initialized (migration complete)");
	}

	// Log current configuration
	log("NVS configuration:");
	log("  LED Brightness: " + String(getLedBrightness()));
	log("  LED Data Pin: " + String(getLedDataPin()));
}

uint8_t ConfigNVS::getLedBrightness() {
	prefs.begin(NAMESPACE, true);  // Read-only mode
	uint8_t brightness = prefs.getUChar(KEY_BRIGHTNESS, DEFAULT_BRIGHTNESS);
	prefs.end();

	// Validate range
	if (brightness == 0 || brightness > 255) {
		log("WARNING: Invalid brightness in NVS, using default");
		return DEFAULT_BRIGHTNESS;
	}

	return brightness;
}

void ConfigNVS::setLedBrightness(uint8_t brightness) {
	// Validate input
	if (brightness == 0 || brightness > 255) {
		log("WARNING: Invalid brightness value, using default");
		brightness = DEFAULT_BRIGHTNESS;
	}

	prefs.begin(NAMESPACE, false);  // Read-write mode
	prefs.putUChar(KEY_BRIGHTNESS, brightness);
	prefs.end();

	log("LED brightness saved to NVS: " + String(brightness));
}

uint8_t ConfigNVS::getLedDataPin() {
	prefs.begin(NAMESPACE, true);  // Read-only mode
	uint8_t pin = prefs.getUChar(KEY_DATA_PIN, DEFAULT_DATA_PIN);
	prefs.end();

	// Validate range (ESP32 GPIO 0-33)
	if (pin > 33) {
		log("WARNING: Invalid data pin in NVS, using default");
		return DEFAULT_DATA_PIN;
	}

	return pin;
}

void ConfigNVS::setLedDataPin(uint8_t pin) {
	// Validate input
	if (pin > 33) {
		log("WARNING: Invalid GPIO pin, using default");
		pin = DEFAULT_DATA_PIN;
	}

	prefs.begin(NAMESPACE, false);  // Read-write mode
	prefs.putUChar(KEY_DATA_PIN, pin);
	prefs.end();

	log("LED data pin saved to NVS: " + String(pin));
}

void ConfigNVS::factoryReset() {
	log("Factory reset: Clearing NVS configuration...");

	prefs.begin(NAMESPACE, false);  // Read-write mode
	prefs.clear();  // Remove all keys in namespace
	prefs.end();

	log("NVS configuration cleared - defaults will be used");
}

bool ConfigNVS::hasMigrated() {
	prefs.begin(NAMESPACE, true);  // Read-only mode
	bool migrated = prefs.getBool(KEY_MIGRATED, false);
	prefs.end();

	return migrated;
}

void ConfigNVS::migrateFromEEPROM() {
	log("Starting EEPROM to NVS migration...");

	// Try to read old IotWebConf EEPROM configuration
	// IotWebConf structure (simplified):
	// Bytes 0-9: Config signature ("iotWebConf" + version)
	// After signature: WiFi SSID, password, AP password, custom parameters
	//
	// Custom parameters section contains LED settings as null-terminated strings:
	// - LED brightness (string like "64\0")
	// - LED data pin (string like "16\0")
	//
	// We need to locate these values. For safety, we'll look for reasonable
	// brightness (1-255) and pin (0-33) values in EEPROM.

	EEPROM.begin(512);

	// Check for valid IotWebConf config signature
	bool hasValidConfig = false;
	String signature = "";
	for (int i = 0; i < 10; i++) {
		char c = EEPROM.read(i);
		if (c >= 32 && c <= 126) {  // Printable ASCII
			signature += c;
		}
	}

	// IotWebConf signature starts with "iotWebConf" or similar
	if (signature.startsWith("iot") || signature.indexOf("rgfx") >= 0) {
		hasValidConfig = true;
		log("Found IotWebConf signature in EEPROM: " + signature);
	}

	uint8_t brightness = DEFAULT_BRIGHTNESS;
	uint8_t dataPin = DEFAULT_DATA_PIN;

	if (hasValidConfig) {
		// Scan EEPROM for LED configuration values
		// Look for brightness value (stored as string, e.g., "64\0")
		// and data pin (stored as string, e.g., "16\0")
		//
		// Since IotWebConf uses variable-length strings, we can't rely on
		// fixed offsets. Instead, we'll search for numeric strings that
		// match our expected ranges.
		//
		// This is a best-effort migration - if we can't find valid values,
		// we'll use defaults.

		for (int i = 10; i < 500; i++) {
			// Look for potential brightness value (1-3 digit number)
			if (EEPROM.read(i) >= '0' && EEPROM.read(i) <= '9') {
				String numStr = "";
				int j = i;
				// Read up to 3 digits
				while (j < 512 && EEPROM.read(j) >= '0' && EEPROM.read(j) <= '9' && (j - i) < 3) {
					numStr += (char)EEPROM.read(j);
					j++;
				}

				// Check if null-terminated
				if (j < 512 && EEPROM.read(j) == 0) {
					int value = numStr.toInt();

					// Check if it's a valid brightness value
					if (value >= 1 && value <= 255) {
						// Could be brightness - save it tentatively
						brightness = value;
						log("Found potential brightness value in EEPROM: " + String(value));
						break;  // Use first valid value found
					}
				}
			}
		}

		// Search for data pin (typically 0-33)
		for (int i = 10; i < 500; i++) {
			if (EEPROM.read(i) >= '0' && EEPROM.read(i) <= '9') {
				String numStr = "";
				int j = i;
				// Read up to 2 digits
				while (j < 512 && EEPROM.read(j) >= '0' && EEPROM.read(j) <= '9' && (j - i) < 2) {
					numStr += (char)EEPROM.read(j);
					j++;
				}

				// Check if null-terminated
				if (j < 512 && EEPROM.read(j) == 0) {
					int value = numStr.toInt();

					// Check if it's a valid GPIO pin
					if (value >= 0 && value <= 33 && value != brightness) {
						// Could be data pin - save it tentatively
						dataPin = value;
						log("Found potential data pin value in EEPROM: " + String(value));
						break;  // Use first valid value found
					}
				}
			}
		}
	} else {
		log("No valid EEPROM configuration found - using defaults");
	}

	EEPROM.end();

	// Save migrated values to NVS
	prefs.begin(NAMESPACE, false);  // Read-write mode
	prefs.putUChar(KEY_BRIGHTNESS, brightness);
	prefs.putUChar(KEY_DATA_PIN, dataPin);
	prefs.putBool(KEY_MIGRATED, true);  // Mark migration complete
	prefs.end();

	log("Migration complete:");
	log("  Brightness: " + String(brightness));
	log("  Data Pin: " + String(dataPin));
	log("  Migrated flag: true");
}
