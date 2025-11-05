#include "log.h"
#include "serial.h"
#include <Arduino.h>

void log(const char* message) {
	SerialCommand::log(String(message));
}

void log(const String& message) {
	SerialCommand::log(message);
}
