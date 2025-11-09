/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DISPLAY_H
#define DISPLAY_H

#include <Arduino.h>

/**
 * OLED Display Module (Optional)
 *
 * Manages SSD1306 128x64 OLED display for showing system status.
 * Gracefully handles missing display - all functions are no-ops if display not detected.
 *
 * Hardware Connection:
 *   VCC -> 3.3V
 *   GND -> GND
 *   SCL -> GPIO 22 (I2C clock)
 *   SDA -> GPIO 21 (I2C data)
 *
 * Design Philosophy:
 *   - Display is completely optional
 *   - Runs on Core 0 (network core) to avoid impacting LED effects on Core 1
 *   - Updates only on state changes or periodic intervals (10s)
 *   - Fast I2C clock (400kHz) for minimal blocking time
 */

namespace Display {

	/**
	 * Initialize OLED display
	 *
	 * Probes I2C bus for display at address 0x3C and initializes if found.
	 * Sets I2C clock to 400kHz (fast mode) for quicker updates.
	 *
	 * @return true if display detected and initialized, false otherwise
	 */
	bool begin();

	/**
	 * Check if display is available
	 *
	 * @return true if display was successfully initialized and is available
	 */
	bool isAvailable();

	/**
	 * Show boot screen
	 *
	 * Displays "RGFX Driver" title and device name.
	 * Call once during setup().
	 */
	void showBoot(const String& deviceName);

	/**
	 * Show WiFi connecting screen
	 *
	 * Displays "Connecting..." message with target SSID.
	 * Call when WiFi connection attempt begins.
	 *
	 * @param ssid WiFi network name being connected to
	 */
	void showConnecting(const String& ssid);

	/**
	 * Show AP mode screen
	 *
	 * Displays "Setup Mode" message with AP SSID and IP address (192.168.4.1).
	 * Call when entering AP mode for configuration.
	 *
	 * @param apName Access point SSID
	 */
	void showAPMode(const String& apName);

	/**
	 * Update AP mode countdown timer
	 *
	 * Updates the countdown timer shown in AP mode (top right corner).
	 * Shows seconds remaining before auto-connect to WiFi.
	 * Call periodically (e.g., every second) while in AP mode.
	 *
	 * @param secondsRemaining Seconds until auto-connect (0 = no timeout)
	 */
	void updateAPModeCountdown(uint16_t secondsRemaining);

	/**
	 * Show connected screen
	 *
	 * Displays WiFi connection details: SSID, IP address, and MQTT status.
	 * Call when WiFi successfully connects.
	 *
	 * @param ssid WiFi network name
	 * @param ip IP address assigned to device
	 * @param mqttConnected MQTT broker connection status
	 */
	void showConnected(const String& ssid, const String& ip, bool mqttConnected);

	/**
	 * Update MQTT connection status
	 *
	 * Updates just the MQTT status line on the display.
	 * Call when MQTT connection state changes.
	 *
	 * @param connected true if MQTT broker is connected
	 */
	void updateMQTTStatus(bool connected);

	/**
	 * Update uptime display
	 *
	 * Updates the uptime counter on the display.
	 * Call periodically (e.g., every 10 seconds) from Core 0 network task.
	 *
	 * @param uptimeSeconds System uptime in seconds
	 */
	void updateUptime(unsigned long uptimeSeconds);

	/**
	 * Clear display
	 *
	 * Clears the entire display (turns all pixels off).
	 */
	void clear();

}  // namespace Display

#endif  // DISPLAY_H
