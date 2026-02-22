#include "commands.h"
#include "log.h"
#include <Arduino.h>

namespace Commands {

	void help(const String& args) {
		log("\n=== RGFX Driver Serial Commands ===");
		log("wifi SSID PASSWORD   - Set WiFi credentials and restart");
		log("                       Supports quoted strings for SSIDs/passwords with spaces");
		log("                       Example: wifi MyNetwork MyPassword123");
		log("                       Example: wifi \"My Network\" \"My Password 123\"");
		log("reset                - Erase WiFi credentials and restart");
		log("telemetry            - Display system telemetry (JSON)");
		log("test_leds on|off     - Enable/disable LED test pattern");
		log("udp_reset            - Reinitialize UDP socket (recover from stall)");
		log("help                 - Show this help message");
	}

}  // namespace Commands
