#include "commands.h"
#include "safe_restart.h"

namespace Commands {

	void reboot(const String& args) {
		safeRestart();
	}

}  // namespace Commands
