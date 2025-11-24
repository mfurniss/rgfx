/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#include "commands.h"
#include "log.h"
#include <Arduino.h>

namespace Commands {

	void reboot(const String& args) {
		log("Reboot: Restarting device...");
		delay(1000);
		ESP.restart();
	}

}  // namespace Commands
