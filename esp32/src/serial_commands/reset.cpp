#include "commands.h"
#include "config/config_nvs.h"
#include "config/config_portal.h"
#include "log.h"
#include "safe_restart.h"

namespace Commands {

	void reset(const String& args) {
		log("Reset: Erasing all configuration and rebooting...");

		// Clear NVS configuration (device ID, LED config)
		ConfigNVS::factoryReset();

		// Clear WiFi credentials (IotWebConf)
		ConfigPortal::resetSettings();

		safeRestart();
	}

}  // namespace Commands
