/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit tests for serial WiFi command argument parsing
 *
 * Tests the SSID/password parsing logic from wifi.cpp:
 * - Unquoted arguments: "MySSID MyPassword"
 * - Quoted arguments: "\"My SSID\" \"My Password\""
 * - SSID only (no password)
 * - Empty input (show current)
 */

#include <unity.h>
#include <string>
#include <cstring>

#ifdef UNIT_TEST

using String = std::string;

// Stubs
enum class LogLevel { INFO, ERROR };
void log(const char*, LogLevel = LogLevel::INFO) {}
void log(const String&, LogLevel = LogLevel::INFO) {}

// Tracking state
static String lastSetSsid;
static String lastSetPassword;
static bool wifiCredentialsSet = false;
static bool restartCalled = false;
static bool showCurrentCalled = false;
static String currentSsid = "";
static String currentPassword = "";

// Mock ConfigPortal
namespace ConfigPortal {
bool setWiFiCredentials(const String& ssid, const String& password) {
	lastSetSsid = ssid;
	lastSetPassword = password;
	wifiCredentialsSet = true;
	return true;
}
String getWiFiSsid() {
	showCurrentCalled = true;
	return currentSsid;
}
String getWiFiPassword() { return currentPassword; }
}  // namespace ConfigPortal

void safeRestart() { restartCalled = true; }

// std::string helpers matching Arduino String API
static String trim(const String& s) {
	size_t start = s.find_first_not_of(" \t\r\n");
	if (start == String::npos) return "";
	size_t end = s.find_last_not_of(" \t\r\n");
	return s.substr(start, end - start + 1);
}

// --- Extracted: WiFi command parsing logic (mirrors wifi.cpp) ---

struct ParsedWifiArgs {
	String ssid;
	String password;
	bool showCurrent;  // No args provided
	bool error;        // Parse failed
};

static ParsedWifiArgs parseWifiArgs(const String& args) {
	ParsedWifiArgs result{"", "", false, false};

	String params = trim(args);

	if (params.length() == 0) {
		result.showCurrent = true;
		return result;
	}

	size_t firstQuote = params.find('"');
	if (firstQuote == 0) {
		// Quoted SSID
		size_t secondQuote = params.find('"', 1);
		if (secondQuote != String::npos && secondQuote > 0) {
			result.ssid = params.substr(1, secondQuote - 1);
			String remainder = trim(params.substr(secondQuote + 1));

			if (remainder.length() > 0 && remainder[0] == '"') {
				size_t thirdQuote = remainder.find('"', 1);
				if (thirdQuote != String::npos && thirdQuote > 0) {
					result.password = remainder.substr(1, thirdQuote - 1);
				}
			} else {
				result.password = remainder;
			}
		}
	} else {
		// Unquoted SSID and password (space-separated)
		size_t spacePos = params.find(' ');
		if (spacePos != String::npos) {
			result.ssid = params.substr(0, spacePos);
			result.password = trim(params.substr(spacePos + 1));
		} else {
			result.ssid = params;
		}
	}

	if (result.ssid.length() == 0) {
		result.error = true;
	}

	return result;
}

// =============================================================================
// Setup / Teardown
// =============================================================================

void setUp(void) {
	lastSetSsid = "";
	lastSetPassword = "";
	wifiCredentialsSet = false;
	restartCalled = false;
	showCurrentCalled = false;
	currentSsid = "";
	currentPassword = "";
}

void tearDown(void) {}

// =============================================================================
// Argument Parsing Tests
// =============================================================================

void test_unquoted_ssid_and_password() {
	auto result = parseWifiArgs("MyNetwork MyPassword123");

	TEST_ASSERT_EQUAL_STRING("MyNetwork", result.ssid.c_str());
	TEST_ASSERT_EQUAL_STRING("MyPassword123", result.password.c_str());
	TEST_ASSERT_FALSE(result.showCurrent);
	TEST_ASSERT_FALSE(result.error);
}

void test_quoted_ssid_and_password() {
	auto result = parseWifiArgs("\"My Network\" \"My Password 123\"");

	TEST_ASSERT_EQUAL_STRING("My Network", result.ssid.c_str());
	TEST_ASSERT_EQUAL_STRING("My Password 123", result.password.c_str());
}

void test_quoted_ssid_unquoted_password() {
	auto result = parseWifiArgs("\"My Network\" simple_pass");

	TEST_ASSERT_EQUAL_STRING("My Network", result.ssid.c_str());
	TEST_ASSERT_EQUAL_STRING("simple_pass", result.password.c_str());
}

void test_ssid_only_no_password() {
	auto result = parseWifiArgs("OpenNetwork");

	TEST_ASSERT_EQUAL_STRING("OpenNetwork", result.ssid.c_str());
	TEST_ASSERT_EQUAL_STRING("", result.password.c_str());
	TEST_ASSERT_FALSE(result.error);
}

void test_empty_args_shows_current() {
	auto result = parseWifiArgs("");

	TEST_ASSERT_TRUE(result.showCurrent);
	TEST_ASSERT_EQUAL_STRING("", result.ssid.c_str());
}

void test_whitespace_only_shows_current() {
	auto result = parseWifiArgs("   ");

	TEST_ASSERT_TRUE(result.showCurrent);
}

void test_quoted_ssid_with_spaces_and_quoted_password_with_spaces() {
	auto result = parseWifiArgs("\"Coffee Shop WiFi\" \"passw0rd 123!\"");

	TEST_ASSERT_EQUAL_STRING("Coffee Shop WiFi", result.ssid.c_str());
	TEST_ASSERT_EQUAL_STRING("passw0rd 123!", result.password.c_str());
}

void test_leading_trailing_whitespace_trimmed() {
	auto result = parseWifiArgs("  MyNet  MyPass  ");

	TEST_ASSERT_EQUAL_STRING("MyNet", result.ssid.c_str());
	TEST_ASSERT_EQUAL_STRING("MyPass", result.password.c_str());
}

// =============================================================================
// Main
// =============================================================================

int main(int /* argc */, char** /* argv */) {
	UNITY_BEGIN();

	RUN_TEST(test_unquoted_ssid_and_password);
	RUN_TEST(test_quoted_ssid_and_password);
	RUN_TEST(test_quoted_ssid_unquoted_password);
	RUN_TEST(test_ssid_only_no_password);
	RUN_TEST(test_empty_args_shows_current);
	RUN_TEST(test_whitespace_only_shows_current);
	RUN_TEST(test_quoted_ssid_with_spaces_and_quoted_password_with_spaces);
	RUN_TEST(test_leading_trailing_whitespace_trimmed);

	return UNITY_END();
}

#endif  // UNIT_TEST
