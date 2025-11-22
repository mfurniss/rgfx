/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#include "commands.h"
#include "config/config_nvs.h"
#include "config/config_portal.h"
#include "log.h"
#include <Arduino.h>

namespace Commands {

	void reset(const String& args) {
		log("Reset: Erasing all configuration and rebooting...");

		// Clear NVS configuration (device ID, LED config)
		ConfigNVS::factoryReset();

		// Clear WiFi credentials (IotWebConf)
		ConfigPortal::resetSettings();

		delay(1000);
		ESP.restart();
	}

}  // namespace Commands
