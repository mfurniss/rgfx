/**
 * Native Log Stub
 *
 * Provides a simple printf-based log implementation for native builds.
 */
#include "log.h"
#include <cstdio>

void log(const char* message, LogLevel level) {
	const char* prefix = (level == LogLevel::ERROR) ? "[ERROR] " : "[INFO] ";
	printf("%s%s\n", prefix, message);
}
