/**
 * Unit tests for MQTT broker discovery via UDP broadcast
 *
 * Tests the discoverMQTTBroker() function which listens for Hub broadcast
 * announcements on port 8889, validates subnet matching, and extracts broker IP/port.
 *
 * Uses mock_wifi_udp.h for packet injection.
 */

#include <unity.h>
#include <ArduinoJson.h>
#include <string>
#include <cstring>

#ifdef UNIT_TEST

using String = std::string;

// Mock WiFiUDP with IPAddress
#include "../mocks/mock_wifi_udp.h"

// Mock MQTT client
#include "../mocks/mock_mqtt.h"

// Stubs
void log(const char*) {}
void log(const String&) {}

// Controllable millis() for timeout testing
static unsigned long mockMillisValue = 0;
unsigned long millis() { return mockMillisValue; }
void delay(unsigned long ms) { mockMillisValue += ms; }

// Global MQTT state (from mqtt.cpp)
char mqttServerIP[16] = {0};
bool mqttServerDiscovered = false;
MQTTClient mqttClient(512);

// Mock WiFi class with configurable IP/subnet
static IPAddress mockLocalIP(192, 168, 1, 100);
static IPAddress mockSubnetMask(255, 255, 255, 0);

struct MockWiFiClass {
	IPAddress localIP() { return mockLocalIP; }
	IPAddress subnetMask() { return mockSubnetMask; }
};
static MockWiFiClass WiFi;

// --- Extracted: discoverMQTTBroker (mirrors mqtt_discovery.cpp) ---
// Uses injected WiFiUDP rather than creating its own

static WiFiUDP testUdp;

bool discoverMQTTBroker() {
	IPAddress ourIP = WiFi.localIP();
	IPAddress ourSubnet = WiFi.subnetMask();

	if (!testUdp.begin(8889)) {
		return false;
	}

	unsigned long startTime = millis();
	while (millis() - startTime < 6000) {
		int packetSize = testUdp.parsePacket();
		if (packetSize > 0) {
			char packet[512];
			int len = testUdp.read(packet, sizeof(packet) - 1);
			if (len <= 0 || len >= (int)sizeof(packet)) {
				continue;
			}
			packet[len] = '\0';

			JsonDocument doc;
			DeserializationError error = deserializeJson(doc, packet);
			if (error) {
				continue;
			}

			const char* service = doc["service"];
			if (service && String(service) == "rgfx-mqtt-broker") {
				const char* ipStr = doc["ip"];
				int port = doc["port"] | 0;

				if (ipStr && port > 0) {
					IPAddress brokerIP;
					if (brokerIP.fromString(ipStr)) {
						bool sameSubnet = true;
						for (int j = 0; j < 4; j++) {
							if ((ourIP[j] & ourSubnet[j]) != (brokerIP[j] & ourSubnet[j])) {
								sameSubnet = false;
								break;
							}
						}

						if (sameSubnet) {
							strncpy(mqttServerIP, ipStr, sizeof(mqttServerIP) - 1);
							mqttServerIP[sizeof(mqttServerIP) - 1] = '\0';
							mqttServerDiscovered = true;
							mqttClient.setHost(mqttServerIP, port);
							testUdp.stop();
							return true;
						}
					}
				}
			}
		}
		delay(10);
	}

	testUdp.stop();
	return false;
}

// =============================================================================
// Setup / Teardown
// =============================================================================

void setUp(void) {
	mqttServerIP[0] = '\0';
	mqttServerDiscovered = false;
	mockMillisValue = 0;
	mockLocalIP = IPAddress(192, 168, 1, 100);
	mockSubnetMask = IPAddress(255, 255, 255, 0);
	// Clear any leftover packets
	while (!testUdp.incomingPackets.empty()) {
		testUdp.incomingPackets.pop();
	}
	testUdp.listening = false;
}

void tearDown(void) {}

// Helper: inject a valid discovery packet
static void injectValidPacket(const char* ip = "192.168.1.50", int port = 1883) {
	char json[256];
	snprintf(json, sizeof(json), R"({"service":"rgfx-mqtt-broker","ip":"%s","port":%d})", ip, port);
	testUdp.injectPacket(IPAddress(192, 168, 1, 50), 8889, json);
}

// =============================================================================
// Successful Discovery Tests
// =============================================================================

void test_valid_discovery_packet_sets_broker_ip() {
	injectValidPacket("192.168.1.50");

	bool result = discoverMQTTBroker();

	TEST_ASSERT_TRUE(result);
	TEST_ASSERT_EQUAL_STRING("192.168.1.50", mqttServerIP);
	TEST_ASSERT_TRUE(mqttServerDiscovered);
}

void test_discovery_with_custom_port() {
	char json[256];
	snprintf(json, sizeof(json), R"({"service":"rgfx-mqtt-broker","ip":"192.168.1.50","port":1884})");
	testUdp.injectPacket(IPAddress(192, 168, 1, 50), 8889, json);

	bool result = discoverMQTTBroker();
	TEST_ASSERT_TRUE(result);
}

// =============================================================================
// Subnet Validation Tests
// =============================================================================

void test_broker_on_different_subnet_rejected() {
	// Our IP: 192.168.1.100/24, broker: 10.0.0.50 (different subnet)
	char json[256];
	snprintf(json, sizeof(json), R"({"service":"rgfx-mqtt-broker","ip":"10.0.0.50","port":1883})");
	testUdp.injectPacket(IPAddress(10, 0, 0, 50), 8889, json);

	bool result = discoverMQTTBroker();

	TEST_ASSERT_FALSE(result);
	TEST_ASSERT_FALSE(mqttServerDiscovered);
}

void test_broker_on_same_class_b_subnet() {
	mockLocalIP = IPAddress(172, 16, 0, 100);
	mockSubnetMask = IPAddress(255, 255, 0, 0);

	char json[256];
	snprintf(json, sizeof(json), R"({"service":"rgfx-mqtt-broker","ip":"172.16.5.23","port":1883})");
	testUdp.injectPacket(IPAddress(172, 16, 5, 23), 8889, json);

	bool result = discoverMQTTBroker();
	TEST_ASSERT_TRUE(result);
	TEST_ASSERT_EQUAL_STRING("172.16.5.23", mqttServerIP);
}

// =============================================================================
// Malformed Packet Tests
// =============================================================================

void test_malformed_json_ignored() {
	testUdp.injectPacket(IPAddress(192, 168, 1, 50), 8889, "not valid json{{{");

	bool result = discoverMQTTBroker();
	TEST_ASSERT_FALSE(result);
}

void test_missing_service_field_ignored() {
	testUdp.injectPacket(IPAddress(192, 168, 1, 50), 8889,
	                     R"({"ip":"192.168.1.50","port":1883})");

	bool result = discoverMQTTBroker();
	TEST_ASSERT_FALSE(result);
}

void test_wrong_service_value_ignored() {
	testUdp.injectPacket(IPAddress(192, 168, 1, 50), 8889,
	                     R"({"service":"other-service","ip":"192.168.1.50","port":1883})");

	bool result = discoverMQTTBroker();
	TEST_ASSERT_FALSE(result);
}

void test_missing_ip_field_ignored() {
	testUdp.injectPacket(IPAddress(192, 168, 1, 50), 8889,
	                     R"({"service":"rgfx-mqtt-broker","port":1883})");

	bool result = discoverMQTTBroker();
	TEST_ASSERT_FALSE(result);
}

void test_missing_port_field_ignored() {
	testUdp.injectPacket(IPAddress(192, 168, 1, 50), 8889,
	                     R"({"service":"rgfx-mqtt-broker","ip":"192.168.1.50"})");

	bool result = discoverMQTTBroker();
	TEST_ASSERT_FALSE(result);
}

void test_zero_port_ignored() {
	testUdp.injectPacket(IPAddress(192, 168, 1, 50), 8889,
	                     R"({"service":"rgfx-mqtt-broker","ip":"192.168.1.50","port":0})");

	bool result = discoverMQTTBroker();
	TEST_ASSERT_FALSE(result);
}

void test_invalid_ip_string_ignored() {
	testUdp.injectPacket(IPAddress(192, 168, 1, 50), 8889,
	                     R"({"service":"rgfx-mqtt-broker","ip":"not_an_ip","port":1883})");

	bool result = discoverMQTTBroker();
	TEST_ASSERT_FALSE(result);
}

// =============================================================================
// Multiple Packet Tests
// =============================================================================

void test_invalid_then_valid_packet_finds_broker() {
	// First packet is malformed
	testUdp.injectPacket(IPAddress(192, 168, 1, 50), 8889, "garbage");
	// Second packet is valid
	injectValidPacket("192.168.1.23");

	bool result = discoverMQTTBroker();
	TEST_ASSERT_TRUE(result);
	TEST_ASSERT_EQUAL_STRING("192.168.1.23", mqttServerIP);
}

// =============================================================================
// Timeout Tests
// =============================================================================

void test_no_packets_returns_false_after_timeout() {
	// No packets injected, advance time past 6-second timeout
	bool result = discoverMQTTBroker();
	TEST_ASSERT_FALSE(result);
	TEST_ASSERT_FALSE(mqttServerDiscovered);
}

// =============================================================================
// Main
// =============================================================================

int main(int /* argc */, char** /* argv */) {
	UNITY_BEGIN();

	// Successful discovery
	RUN_TEST(test_valid_discovery_packet_sets_broker_ip);
	RUN_TEST(test_discovery_with_custom_port);

	// Subnet validation
	RUN_TEST(test_broker_on_different_subnet_rejected);
	RUN_TEST(test_broker_on_same_class_b_subnet);

	// Malformed packets
	RUN_TEST(test_malformed_json_ignored);
	RUN_TEST(test_missing_service_field_ignored);
	RUN_TEST(test_wrong_service_value_ignored);
	RUN_TEST(test_missing_ip_field_ignored);
	RUN_TEST(test_missing_port_field_ignored);
	RUN_TEST(test_zero_port_ignored);
	RUN_TEST(test_invalid_ip_string_ignored);

	// Multiple packets
	RUN_TEST(test_invalid_then_valid_packet_finds_broker);

	// Timeout
	RUN_TEST(test_no_packets_returns_false_after_timeout);

	return UNITY_END();
}

#endif  // UNIT_TEST
