/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

#include "commands.h"
#include "network/udp.h"
#include "log.h"

namespace Commands {

	void udpReset(const String& args) {
		(void)args;  // Unused
		log("UDP reset command received");
		reinitializeUDP();
	}

}  // namespace Commands
