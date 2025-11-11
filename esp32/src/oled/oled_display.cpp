/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "oled/oled_display.h"
#include "log.h"
#include "version.h"
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// Display configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_I2C_ADDRESS 0x3C
#define OLED_RESET -1  // No reset pin (sharing ESP32 reset)
#define I2C_SDA 21
#define I2C_SCL 22
#define I2C_CLOCK_SPEED 400000  // 400kHz (fast mode) for quicker updates

// Display instance (allocated on heap to save stack space)
static Adafruit_SSD1306* display = nullptr;
static bool displayAvailable = false;

// Cached status for efficient updates
static String cachedSSID = "";
static String cachedIP = "";
static bool cachedMQTTStatus = false;
static unsigned long lastUptimeUpdate = 0;

namespace Display {

	static String formatDeviceId(const String& deviceName) {
		int lastDashPos = deviceName.lastIndexOf('-');
		if (lastDashPos == -1) {
			return "";
		}

		String deviceId = deviceName.substring(lastDashPos + 1);
		deviceId.toUpperCase();

		if (deviceId.length() != 6) {
			return deviceId;
		}

		return deviceId.substring(0, 2) + ":" + deviceId.substring(2, 4) + ":" +
		       deviceId.substring(4, 6);
	}

	bool begin() {
		log("Initializing OLED display...");

		// Initialize I2C with custom pins and standard clock speed for detection
		Wire.begin(I2C_SDA, I2C_SCL);
		Wire.setClock(100000);  // Start with standard 100kHz for reliable detection

		// Give display time to power up
		delay(50);

		// Probe I2C bus for display at 0x3C
		Wire.beginTransmission(OLED_I2C_ADDRESS);
		byte error = Wire.endTransmission();

		if (error != 0) {
			log("No OLED display detected at address 0x3C");
			log("Display features disabled - continuing without display");
			displayAvailable = false;
			return false;
		}

		log("OLED display detected at 0x3C");

		// Now switch to fast clock for better performance
		Wire.setClock(I2C_CLOCK_SPEED);

		// Allocate display object
		display = new Adafruit_SSD1306(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

		// Initialize display with SSD1306 driver
		if (!display->begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDRESS)) {
			log("SSD1306 initialization failed!");
			delete display;
			display = nullptr;
			displayAvailable = false;
			return false;
		}

		log("OLED display initialized successfully");
		log("I2C clock: 400kHz (fast mode)");

		// Configure display defaults
		display->setTextColor(SSD1306_WHITE);
		display->setTextWrap(false);
		display->cp437(true);  // Use full 256 char 'Code Page 437' font

		// Clear and show initial blank screen
		display->clearDisplay();
		display->display();

		displayAvailable = true;
		return true;
	}

	bool isAvailable() {
		return displayAvailable;
	}

	void showBoot(const String& deviceName) {
		display->clearDisplay();

		String formattedId = formatDeviceId(deviceName);

		// Title with device ID
		display->setTextSize(2);
		display->setCursor(0, 8);
		display->print("RGFX ");
		display->setTextSize(1);
		display->println(formattedId);

		// Version
		display->setTextSize(1);
		display->setCursor(0, 36);
		display->print("v");
		display->println(RGFX_VERSION);

		// Full device name
		display->setCursor(0, 48);
		display->println(deviceName);

		display->display();

		log("Display: Boot screen shown");
	}

	void showConnecting(const String& ssid, const String& deviceName) {
		display->clearDisplay();

		String formattedId = formatDeviceId(deviceName);

		// Header
		display->setTextSize(1);
		display->setCursor(0, 0);
		display->print("RGFX ");
		display->println(formattedId);
		display->println();

		// Status message
		display->setTextSize(1);
		display->println("Connecting to:");
		display->println();
		display->setTextSize(1);

		// Truncate SSID if too long (21 chars max at size 1)
		String truncatedSSID = ssid;
		if (ssid.length() > 21) {
			truncatedSSID = ssid.substring(0, 18) + "...";
		}
		display->println(truncatedSSID);

		display->display();

		log("Display: Connecting screen shown");
	}

	void showAPMode(const String& apName) {
		display->clearDisplay();

		String formattedId = formatDeviceId(apName);

		// Header
		display->setTextSize(1);
		display->setCursor(0, 0);
		display->print("RGFX ");
		display->println(formattedId);
		display->drawLine(0, 10, SCREEN_WIDTH - 1, 10, SSD1306_WHITE);

		// Setup mode message (left side)
		display->setCursor(0, 16);
		display->setTextSize(2);
		display->println("SETUP");
		display->println(" MODE");

		// AP info
		display->setTextSize(1);
		display->setCursor(0, 48);

		// Truncate AP name if too long
		String truncatedAP = apName;
		if (apName.length() > 21) {
			truncatedAP = apName.substring(0, 18) + "...";
		}
		display->println(truncatedAP);

		display->setCursor(0, 56);
		display->println("192.168.4.1");

		display->display();

		log("Display: AP mode screen shown");
	}

	void updateAPModeCountdown(uint16_t secondsRemaining) {
		// Clear countdown area (right side, next to "SETUP MODE")
		display->fillRect(80, 16, SCREEN_WIDTH - 80, 32, SSD1306_BLACK);

		// Show countdown if > 0
		if (secondsRemaining > 0) {
			display->setTextSize(2);
			display->setCursor(88, 20);

			// Right-align the number
			if (secondsRemaining < 10) {
				display->print(" ");
			}
			display->print(secondsRemaining);

			// Small "s" below
			display->setTextSize(1);
			display->setCursor(98, 34);
			display->print("sec");
		}

		display->display();
	}

	void showConnected(const String& ssid, const String& ip, bool mqttConnected,
	                   const String& deviceName) {
		// Cache values for later updates
		cachedSSID = ssid;
		cachedIP = ip;
		cachedMQTTStatus = mqttConnected;

		display->clearDisplay();

		String formattedId = formatDeviceId(deviceName);

		// Header
		display->setTextSize(1);
		display->setCursor(0, 0);
		display->print("RGFX ");
		display->println(formattedId);
		display->drawLine(0, 10, SCREEN_WIDTH - 1, 10, SSD1306_WHITE);

		// WiFi SSID
		display->setCursor(0, 14);
		display->print("WiFi: ");
		String truncatedSSID = ssid;
		if (ssid.length() > 15) {
			truncatedSSID = ssid.substring(0, 12) + "...";
		}
		display->println(truncatedSSID);

		// IP Address
		display->setCursor(0, 24);
		display->print("IP: ");
		display->println(ip);

		// MQTT Status
		display->setCursor(0, 34);
		display->print("MQTT: ");
		display->println(mqttConnected ? "Connected" : "Disconnected");

		// Uptime (placeholder - will be updated periodically)
		display->setCursor(0, 44);
		display->print("Up: ");
		display->println("00:00:00");

		display->display();

		log("Display: Connected screen shown");
	}

	void updateMQTTStatus(bool connected) {
		// Only update if status actually changed
		if (connected == cachedMQTTStatus)
			return;

		cachedMQTTStatus = connected;

		// Redraw just the MQTT status line (more efficient than full redraw)
		// Clear the status area first
		display->fillRect(0, 34, SCREEN_WIDTH, 8, SSD1306_BLACK);

		display->setTextSize(1);
		display->setCursor(0, 34);
		display->print("MQTT: ");
		display->println(connected ? "Connected" : "Disconnected");

		display->display();

		log("Display: MQTT status updated to " + String(connected ? "connected" : "disconnected"));
	}

	void updateUptime(unsigned long uptimeSeconds) {
		// Only update every second to avoid excessive I2C traffic
		if (uptimeSeconds == lastUptimeUpdate)
			return;
		lastUptimeUpdate = uptimeSeconds;

		// Format uptime as HH:MM:SS
		unsigned long hours = uptimeSeconds / 3600;
		unsigned long minutes = (uptimeSeconds % 3600) / 60;
		unsigned long seconds = uptimeSeconds % 60;

		char uptimeStr[16];
		if (hours > 99) {
			// If over 99 hours, show days instead
			unsigned long days = hours / 24;
			snprintf(uptimeStr, sizeof(uptimeStr), "%lud %02lu:%02lu:%02lu", days, hours % 24,
			         minutes, seconds);
		} else {
			snprintf(uptimeStr, sizeof(uptimeStr), "%02lu:%02lu:%02lu", hours, minutes, seconds);
		}

		// Clear uptime area and redraw
		display->fillRect(0, 44, SCREEN_WIDTH, 8, SSD1306_BLACK);

		display->setTextSize(1);
		display->setCursor(0, 44);
		display->print("Up: ");
		display->println(uptimeStr);

		display->display();
	}

	void clear() {
		display->clearDisplay();
		display->display();

		log("Display: Cleared");
	}

}  // namespace Display
