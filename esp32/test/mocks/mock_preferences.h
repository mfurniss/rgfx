/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOCK_PREFERENCES_H
#define MOCK_PREFERENCES_H

#ifdef UNIT_TEST

#include <string>
#include <map>

/**
 * Mock Preferences class for native testing
 * Simulates ESP32 NVS (Non-Volatile Storage) without actual hardware
 */
class Preferences {
  private:
	std::map<std::string, std::string> storage;
	std::string currentNamespace;
	bool isOpen;

  public:
	Preferences() : isOpen(false) {}

	bool begin(const char* name, bool readOnly = false) {
		currentNamespace = name;
		isOpen = true;
		(void)readOnly; // Ignore read-only flag in mock
		return true;
	}

	void end() { isOpen = false; }

	bool clear() {
		storage.clear();
		return true;
	}

	bool remove(const char* key) {
		std::string fullKey = currentNamespace + ":" + key;
		return storage.erase(fullKey) > 0;
	}

	// String operations
	std::string getString(const char* key, const std::string& defaultValue = "") {
		std::string fullKey = currentNamespace + ":" + key;
		auto it = storage.find(fullKey);
		return (it != storage.end()) ? it->second : defaultValue;
	}

	size_t putString(const char* key, const std::string& value) {
		std::string fullKey = currentNamespace + ":" + key;
		storage[fullKey] = value;
		return value.length();
	}

	// Integer operations
	int getInt(const char* key, int defaultValue = 0) {
		std::string value = getString(key, std::to_string(defaultValue));
		return std::stoi(value);
	}

	size_t putInt(const char* key, int value) {
		return putString(key, std::to_string(value));
	}

	// Boolean operations
	bool getBool(const char* key, bool defaultValue = false) {
		std::string value = getString(key, defaultValue ? "1" : "0");
		return value == "1";
	}

	size_t putBool(const char* key, bool value) {
		return putString(key, value ? "1" : "0");
	}

	// Unsigned integer operations
	unsigned int getUInt(const char* key, unsigned int defaultValue = 0) {
		std::string value = getString(key, std::to_string(defaultValue));
		return static_cast<unsigned int>(std::stoul(value));
	}

	size_t putUInt(const char* key, unsigned int value) {
		return putString(key, std::to_string(value));
	}
};

#endif // UNIT_TEST
#endif // MOCK_PREFERENCES_H
