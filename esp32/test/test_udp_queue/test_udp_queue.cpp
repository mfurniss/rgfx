/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Unit tests for UDP message queue implementation.
 * Tests the circular buffer queue used for handling burst UDP traffic.
 */

#include <unity.h>
#include <ArduinoJson.h>
#include <cstdint>
#include <cstring>
#include <string>

// Test configuration - must match production values
static const int UDP_BUFFER_SIZE = 1024;
static const uint8_t UDP_QUEUE_SIZE = 8;

// Mock Arduino String class
class String {
  public:
	std::string data;

	String() = default;
	String(const char* s) : data(s ? s : "") {}
	String(const std::string& s) : data(s) {}

	const char* c_str() const { return data.c_str(); }
	size_t length() const { return data.length(); }
	bool operator==(const String& other) const { return data == other.data; }
	bool operator==(const char* other) const { return data == other; }
	String operator+(const String& other) const { return String(data + other.data); }
	String operator+(const char* other) const { return String(data + other); }
};

// Include mock WiFiUDP
#include "../mocks/mock_wifi_udp.h"

// UDP message structures (copied from udp.h for testing)
struct UDPMessage {
	String effect;
	JsonDocument props;
};

struct UDPRawMessage {
	char buffer[UDP_BUFFER_SIZE];
	uint16_t length;
};

struct UDPMessageQueue {
	UDPRawMessage messages[UDP_QUEUE_SIZE];
	volatile uint8_t head;
	volatile uint8_t tail;
	volatile uint8_t count;
};

// Test instance of the queue
static UDPMessageQueue testQueue;

// Helper to reset queue state
void resetQueue() {
	memset(&testQueue, 0, sizeof(testQueue));
}

// Helper to enqueue a raw message (mimics processUDP logic)
bool enqueueMessage(const char* json) {
	if (testQueue.count >= UDP_QUEUE_SIZE) {
		return false;
	}
	uint8_t idx = testQueue.head;
	size_t len = strlen(json);
	if (len >= UDP_BUFFER_SIZE) {
		len = UDP_BUFFER_SIZE - 1;
	}
	memcpy(testQueue.messages[idx].buffer, json, len + 1);
	testQueue.messages[idx].length = static_cast<uint16_t>(len);
	testQueue.head = (testQueue.head + 1) % UDP_QUEUE_SIZE;
	testQueue.count++;
	return true;
}

// Helper to dequeue and parse a message (mimics checkUDPMessage logic)
bool dequeueMessage(UDPMessage* message) {
	if (testQueue.count == 0) {
		return false;
	}

	uint8_t idx = testQueue.tail;
	const char* buffer = testQueue.messages[idx].buffer;

	JsonDocument doc;
	DeserializationError error = deserializeJson(doc, buffer);

	testQueue.tail = (testQueue.tail + 1) % UDP_QUEUE_SIZE;
	testQueue.count--;

	if (error) {
		return false;
	}

	if (doc["effect"]) {
		message->effect = doc["effect"].as<const char*>();
	}
	message->props = doc["props"];

	return true;
}

// ============================================================================
// Test Cases
// ============================================================================

void test_empty_queue_returns_false() {
	resetQueue();

	UDPMessage msg;
	TEST_ASSERT_FALSE(dequeueMessage(&msg));
	TEST_ASSERT_EQUAL(0, testQueue.count);
}

void test_single_message_enqueue_dequeue() {
	resetQueue();

	const char* json = R"({"effect":"pulse","props":{"color":"red"}})";
	TEST_ASSERT_TRUE(enqueueMessage(json));
	TEST_ASSERT_EQUAL(1, testQueue.count);

	UDPMessage msg;
	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_EQUAL(0, testQueue.count);
	TEST_ASSERT_TRUE(msg.effect == "pulse");
}

void test_multiple_messages_fifo_order() {
	resetQueue();

	// Enqueue 3 messages
	TEST_ASSERT_TRUE(enqueueMessage(R"({"effect":"first","props":{}})"));
	TEST_ASSERT_TRUE(enqueueMessage(R"({"effect":"second","props":{}})"));
	TEST_ASSERT_TRUE(enqueueMessage(R"({"effect":"third","props":{}})"));
	TEST_ASSERT_EQUAL(3, testQueue.count);

	// Dequeue and verify FIFO order
	UDPMessage msg;

	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_TRUE(msg.effect == "first");

	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_TRUE(msg.effect == "second");

	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_TRUE(msg.effect == "third");

	TEST_ASSERT_EQUAL(0, testQueue.count);
}

void test_queue_full_drops_message() {
	resetQueue();

	// Fill the queue to capacity
	for (uint8_t i = 0; i < UDP_QUEUE_SIZE; i++) {
		char json[64];
		snprintf(json, sizeof(json), R"({"effect":"msg%d","props":{}})", i);
		TEST_ASSERT_TRUE(enqueueMessage(json));
	}
	TEST_ASSERT_EQUAL(UDP_QUEUE_SIZE, testQueue.count);

	// Next enqueue should fail
	TEST_ASSERT_FALSE(enqueueMessage(R"({"effect":"overflow","props":{}})"));
	TEST_ASSERT_EQUAL(UDP_QUEUE_SIZE, testQueue.count);
}

void test_queue_wraparound() {
	resetQueue();

	// Fill queue halfway
	for (int i = 0; i < 4; i++) {
		char json[64];
		snprintf(json, sizeof(json), R"({"effect":"batch1_%d","props":{}})", i);
		TEST_ASSERT_TRUE(enqueueMessage(json));
	}

	// Dequeue 3 messages (advances tail)
	UDPMessage msg;
	for (int i = 0; i < 3; i++) {
		TEST_ASSERT_TRUE(dequeueMessage(&msg));
	}
	TEST_ASSERT_EQUAL(1, testQueue.count);

	// Add 6 more messages (should wrap around)
	for (int i = 0; i < 6; i++) {
		char json[64];
		snprintf(json, sizeof(json), R"({"effect":"batch2_%d","props":{}})", i);
		TEST_ASSERT_TRUE(enqueueMessage(json));
	}
	TEST_ASSERT_EQUAL(7, testQueue.count);

	// Verify wraparound worked - head should have wrapped
	TEST_ASSERT_TRUE(testQueue.head < testQueue.tail || testQueue.count == UDP_QUEUE_SIZE);

	// Drain and verify order
	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_TRUE(msg.effect == "batch1_3");  // Last from batch 1

	for (int i = 0; i < 6; i++) {
		TEST_ASSERT_TRUE(dequeueMessage(&msg));
		char expected[16];
		snprintf(expected, sizeof(expected), "batch2_%d", i);
		TEST_ASSERT_TRUE(msg.effect == expected);
	}

	TEST_ASSERT_EQUAL(0, testQueue.count);
}

void test_invalid_json_consumed_but_returns_false() {
	resetQueue();

	// Enqueue invalid JSON
	TEST_ASSERT_TRUE(enqueueMessage("not valid json"));
	TEST_ASSERT_EQUAL(1, testQueue.count);

	// Dequeue should fail but consume the slot
	UDPMessage msg;
	TEST_ASSERT_FALSE(dequeueMessage(&msg));
	TEST_ASSERT_EQUAL(0, testQueue.count);
}

void test_burst_traffic_scenario() {
	resetQueue();

	// Simulate robotron player death: blue explosion + white pulse in rapid succession
	const char* blueExplosion = R"({"effect":"explode","props":{"color":"blue","reset":true}})";
	const char* whitePulse = R"({"effect":"pulse","props":{"color":"white","duration":2000}})";

	TEST_ASSERT_TRUE(enqueueMessage(blueExplosion));
	TEST_ASSERT_TRUE(enqueueMessage(whitePulse));
	TEST_ASSERT_EQUAL(2, testQueue.count);

	// Both messages should be retrievable in order
	UDPMessage msg;

	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_TRUE(msg.effect == "explode");
	TEST_ASSERT_TRUE(msg.props["color"] == "blue");

	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_TRUE(msg.effect == "pulse");
	TEST_ASSERT_TRUE(msg.props["color"] == "white");

	TEST_ASSERT_EQUAL(0, testQueue.count);
}

void test_message_with_props() {
	resetQueue();

	const char* json = R"({"effect":"explode","props":{"color":"#FF0000","particleCount":200,"power":70}})";
	TEST_ASSERT_TRUE(enqueueMessage(json));

	UDPMessage msg;
	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_TRUE(msg.effect == "explode");
	TEST_ASSERT_EQUAL(200, msg.props["particleCount"].as<int>());
	TEST_ASSERT_EQUAL(70, msg.props["power"].as<int>());
}

void test_interleaved_enqueue_dequeue() {
	resetQueue();

	// Enqueue 2
	TEST_ASSERT_TRUE(enqueueMessage(R"({"effect":"a","props":{}})"));
	TEST_ASSERT_TRUE(enqueueMessage(R"({"effect":"b","props":{}})"));

	// Dequeue 1
	UDPMessage msg;
	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_TRUE(msg.effect == "a");

	// Enqueue 2 more
	TEST_ASSERT_TRUE(enqueueMessage(R"({"effect":"c","props":{}})"));
	TEST_ASSERT_TRUE(enqueueMessage(R"({"effect":"d","props":{}})"));

	// Dequeue all remaining
	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_TRUE(msg.effect == "b");
	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_TRUE(msg.effect == "c");
	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_TRUE(msg.effect == "d");

	TEST_ASSERT_EQUAL(0, testQueue.count);
}

// ============================================================================
// Test Runner
// ============================================================================

void setUp() {
	resetQueue();
}

void tearDown() {
	// Nothing to clean up
}

int main() {
	UNITY_BEGIN();

	RUN_TEST(test_empty_queue_returns_false);
	RUN_TEST(test_single_message_enqueue_dequeue);
	RUN_TEST(test_multiple_messages_fifo_order);
	RUN_TEST(test_queue_full_drops_message);
	RUN_TEST(test_queue_wraparound);
	RUN_TEST(test_invalid_json_consumed_but_returns_false);
	RUN_TEST(test_burst_traffic_scenario);
	RUN_TEST(test_message_with_props);
	RUN_TEST(test_interleaved_enqueue_dequeue);

	return UNITY_END();
}
