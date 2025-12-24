/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#include "commands.h"
#include "config/config_portal.h"
#include "log.h"
#include "safe_restart.h"

namespace Commands {

	void wifi(const String& args) {
		// Format: SSID PASSWORD
		// Example: MyNetwork MyPassword123
		// Example: "My Network" "My Password 123"
		// No args: show current WiFi credentials

		String params = args;
		params.trim();

		// No arguments - show current credentials
		if (params.length() == 0) {
			String currentSsid = ConfigPortal::getWiFiSsid();
			String currentPassword = ConfigPortal::getWiFiPassword();

			if (currentSsid.length() > 0) {
				log("Current WiFi credentials:");
				log("SSID: " + currentSsid);
				log("Password: " + currentPassword);
			} else {
				log("No WiFi credentials configured");
			}
			return;
		}

		// Parse SSID and password (supports quoted strings with spaces)
		String ssid = "";
		String password = "";

		int firstQuote = params.indexOf('"');
		if (firstQuote == 0) {
			// Quoted SSID
			int secondQuote = params.indexOf('"', 1);
			if (secondQuote > 0) {
				ssid = params.substring(1, secondQuote);
				String remainder = params.substring(secondQuote + 1);
				remainder.trim();

				// Check for quoted password
				if (remainder.length() > 0 && remainder.charAt(0) == '"') {
					int thirdQuote = remainder.indexOf('"', 1);
					if (thirdQuote > 0) {
						password = remainder.substring(1, thirdQuote);
					}
				} else {
					// Unquoted password
					password = remainder;
				}
			}
		} else {
			// Unquoted SSID and password (space-separated)
			int spacePos = params.indexOf(' ');
			if (spacePos > 0) {
				ssid = params.substring(0, spacePos);
				password = params.substring(spacePos + 1);
				password.trim();
			} else {
				// SSID only, no password
				ssid = params;
			}
		}

		if (ssid.length() > 0) {
			log("Setting WiFi credentials from serial command...");
			log("SSID: " + ssid);
			log("Password: " + password);

			if (ConfigPortal::setWiFiCredentials(ssid, password)) {
				log("WiFi credentials saved!");
				safeRestart();
			} else {
				log("ERROR: Failed to set WiFi credentials");
			}
		} else {
			log("ERROR: Invalid wifi command format");
			log("Usage: wifi SSID PASSWORD");
			log("Example: wifi MyNetwork MyPassword123");
			log("Example: wifi \"My Network\" \"My Password 123\"");
		}
	}

}  // namespace Commands
