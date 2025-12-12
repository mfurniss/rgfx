/**
 * Configuration Loading
 *
 * Loads LED hardware configuration from JSON files.
 */
#pragma once

#include <cstdint>
#include <string>

/**
 * LED hardware configuration loaded from JSON.
 */
struct LedConfig {
	uint16_t width;
	uint16_t height;
	std::string layout;
	std::string name;
	std::string path;
};

/**
 * Load LED hardware config from JSON file.
 *
 * @param path Path to JSON config file
 * @param config Output configuration
 * @return true on success, false on error
 */
bool loadHardwareConfig(const char* path, LedConfig& config);

/**
 * Print usage information.
 */
void printUsage(const char* programName);
