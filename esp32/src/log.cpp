#include "log.h"
#include <Arduino.h>

void log(const char* message) {
	Serial.println(message);
}

void log(const String& message) {
	Serial.println(message);
}
