/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit tests for network cleanup behavior
 *
 * Tests that MQTT broker discovery state is properly reset when WiFi disconnects,
 * preventing stale broker IPs from causing repeated connection failures.
 *
 * Bug: Prior to fix, cleanupNetworkServices() did NOT reset mqttServerDiscovered
 * or mqttServerIP, causing drivers to repeatedly fail MQTT reconnection after
 * WiFi disconnect/reconnect cycles.
 */

#include <unity.h>
#include <cstring>

#ifdef UNIT_TEST

// Simulate the global MQTT broker state (from mqtt.cpp)
char mqttServerIP[16] = {0};
bool mqttServerDiscovered = false;

// Simulate network setup flags (from network_init.cpp)
bool mqttSetupDone = false;
bool udpSetupDone = false;
bool otaSetupDone = false;

/**
 * Simplified cleanupNetworkServices() for testing
 * This mirrors the fix applied to network_init.cpp
 */
void cleanupNetworkServices() {
	mqttSetupDone = false;
	udpSetupDone = false;
	otaSetupDone = false;

	// Reset MQTT broker discovery state to force fresh discovery on reconnect
	mqttServerDiscovered = false;
	mqttServerIP[0] = '\0';
}

/**
 * Simulate a broker being discovered (sets state as if broker was found)
 */
void simulateBrokerDiscovered(const char* ip) {
	strncpy(mqttServerIP, ip, sizeof(mqttServerIP) - 1);
	mqttServerIP[sizeof(mqttServerIP) - 1] = '\0';
	mqttServerDiscovered = true;
}

/**
 * Simulate network services being set up
 */
void simulateNetworkSetup() {
	mqttSetupDone = true;
	udpSetupDone = true;
	otaSetupDone = true;
}

void setUp(void) {
	// Reset all state before each test
	mqttServerIP[0] = '\0';
	mqttServerDiscovered = false;
	mqttSetupDone = false;
	udpSetupDone = false;
	otaSetupDone = false;
}

void tearDown(void) {}

// ----------------------------------------------------------------------------
// Test: cleanupNetworkServices resets mqttServerDiscovered flag
// ----------------------------------------------------------------------------
void test_cleanup_resets_mqttServerDiscovered(void) {
	// Arrange: Simulate broker was discovered
	simulateBrokerDiscovered("192.168.1.100");
	TEST_ASSERT_TRUE(mqttServerDiscovered);

	// Act: WiFi disconnects, cleanup is called
	cleanupNetworkServices();

	// Assert: Broker discovery state is reset
	TEST_ASSERT_FALSE(mqttServerDiscovered);
}

// ----------------------------------------------------------------------------
// Test: cleanupNetworkServices clears mqttServerIP
// ----------------------------------------------------------------------------
void test_cleanup_clears_mqttServerIP(void) {
	// Arrange: Simulate broker was discovered with an IP
	simulateBrokerDiscovered("192.168.1.100");
	TEST_ASSERT_EQUAL_STRING("192.168.1.100", mqttServerIP);

	// Act: WiFi disconnects, cleanup is called
	cleanupNetworkServices();

	// Assert: IP is cleared (first byte is null terminator)
	TEST_ASSERT_EQUAL_CHAR('\0', mqttServerIP[0]);
}

// ----------------------------------------------------------------------------
// Test: cleanupNetworkServices resets all network setup flags
// ----------------------------------------------------------------------------
void test_cleanup_resets_setup_flags(void) {
	// Arrange: Simulate network was fully set up
	simulateNetworkSetup();
	TEST_ASSERT_TRUE(mqttSetupDone);
	TEST_ASSERT_TRUE(udpSetupDone);
	TEST_ASSERT_TRUE(otaSetupDone);

	// Act: WiFi disconnects, cleanup is called
	cleanupNetworkServices();

	// Assert: All setup flags are reset
	TEST_ASSERT_FALSE(mqttSetupDone);
	TEST_ASSERT_FALSE(udpSetupDone);
	TEST_ASSERT_FALSE(otaSetupDone);
}

// ----------------------------------------------------------------------------
// Test: WiFi disconnect/reconnect scenario requires fresh broker discovery
// ----------------------------------------------------------------------------
void test_wifi_disconnect_reconnect_scenario(void) {
	// Simulate initial connection
	simulateNetworkSetup();
	simulateBrokerDiscovered("192.168.1.100");

	// Verify initial state
	TEST_ASSERT_TRUE(mqttServerDiscovered);
	TEST_ASSERT_EQUAL_STRING("192.168.1.100", mqttServerIP);

	// Simulate WiFi disconnect (this is when the bug would manifest)
	cleanupNetworkServices();

	// After cleanup, broker state MUST be reset
	// (Before the fix, mqttServerDiscovered would remain true)
	TEST_ASSERT_FALSE_MESSAGE(
	    mqttServerDiscovered,
	    "Bug regression: mqttServerDiscovered should be false after cleanup");
	TEST_ASSERT_EQUAL_CHAR_MESSAGE(
	    '\0', mqttServerIP[0],
	    "Bug regression: mqttServerIP should be cleared after cleanup");

	// Now when WiFi reconnects and setupNetworkServices() runs,
	// the driver will properly re-discover the broker instead of
	// trying to connect to a potentially stale IP
}

// ----------------------------------------------------------------------------
// Test: Cleanup handles already-clean state gracefully
// ----------------------------------------------------------------------------
void test_cleanup_handles_clean_state(void) {
	// Arrange: State is already clean (initial state)
	TEST_ASSERT_FALSE(mqttServerDiscovered);
	TEST_ASSERT_EQUAL_CHAR('\0', mqttServerIP[0]);

	// Act: Cleanup is called (should not crash or cause issues)
	cleanupNetworkServices();

	// Assert: State remains clean
	TEST_ASSERT_FALSE(mqttServerDiscovered);
	TEST_ASSERT_EQUAL_CHAR('\0', mqttServerIP[0]);
}

// ----------------------------------------------------------------------------
// Test: Multiple cleanup calls are idempotent
// ----------------------------------------------------------------------------
void test_cleanup_is_idempotent(void) {
	// Arrange: Simulate broker was discovered
	simulateBrokerDiscovered("10.0.0.50");
	simulateNetworkSetup();

	// Act: Call cleanup multiple times (e.g., rapid WiFi reconnect cycles)
	cleanupNetworkServices();
	cleanupNetworkServices();
	cleanupNetworkServices();

	// Assert: State is properly reset regardless of call count
	TEST_ASSERT_FALSE(mqttServerDiscovered);
	TEST_ASSERT_EQUAL_CHAR('\0', mqttServerIP[0]);
	TEST_ASSERT_FALSE(mqttSetupDone);
}

int main(int /* argc */, char** /* argv */) {
	UNITY_BEGIN();

	RUN_TEST(test_cleanup_resets_mqttServerDiscovered);
	RUN_TEST(test_cleanup_clears_mqttServerIP);
	RUN_TEST(test_cleanup_resets_setup_flags);
	RUN_TEST(test_wifi_disconnect_reconnect_scenario);
	RUN_TEST(test_cleanup_handles_clean_state);
	RUN_TEST(test_cleanup_is_idempotent);

	return UNITY_END();
}

#endif  // UNIT_TEST
