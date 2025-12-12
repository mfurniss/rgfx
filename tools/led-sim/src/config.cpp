/**
 * Configuration Loading Implementation
 */
#include "config.h"
#include <ArduinoJson.h>
#include <cstdio>
#include <fstream>

bool loadHardwareConfig(const char* path, LedConfig& config) {
	std::ifstream file(path);
	if (!file.is_open()) {
		printf("ERROR: Cannot open config file: %s\n", path);
		return false;
	}

	JsonDocument doc;
	DeserializationError error = deserializeJson(doc, file);
	if (error) {
		printf("ERROR: Failed to parse JSON: %s\n", error.c_str());
		return false;
	}

	config.path = path;

	// Get layout type
	const char* layoutStr = doc["layout"] | "strip";
	config.layout = layoutStr;

	// For strips, width = count, height = 1
	// For matrices, need width/height fields
	if (config.layout == "strip") {
		config.width = doc["count"] | 60;
		config.height = 1;
	} else {
		config.width = doc["width"] | 32;
		config.height = doc["height"] | 8;
	}

	// Optional name field
	if (doc["name"].is<const char*>()) {
		config.name = doc["name"].as<const char*>();
	}

	printf("Loaded config: %s\n", path);
	if (!config.name.empty()) {
		printf("  Name: %s\n", config.name.c_str());
	}

	return true;
}

void printUsage(const char* programName) {
	printf("Usage: %s <config.json>\n\n", programName);
	printf("Arguments:\n");
	printf("  config.json    Path to LED hardware configuration file\n\n");
	printf("Example:\n");
	printf("  %s ~/.rgfx/led-hardware/my-matrix.json\n", programName);
}
