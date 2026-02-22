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
