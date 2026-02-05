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
static const int UDP_BUFFER_SIZE = 1472;  // Max UDP payload without IP fragmentation
static const uint8_t UDP_QUEUE_SIZE = 16;  // Increased from 8 for burst handling

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

	// Fill queue past halfway to force wraparound with larger queue (16)
	for (int i = 0; i < 10; i++) {
		char json[64];
		snprintf(json, sizeof(json), R"({"effect":"batch1_%d","props":{}})", i);
		TEST_ASSERT_TRUE(enqueueMessage(json));
	}

	// Dequeue 8 messages (advances tail)
	UDPMessage msg;
	for (int i = 0; i < 8; i++) {
		TEST_ASSERT_TRUE(dequeueMessage(&msg));
	}
	TEST_ASSERT_EQUAL(2, testQueue.count);

	// Add 10 more messages (should wrap around with queue size 16)
	for (int i = 0; i < 10; i++) {
		char json[64];
		snprintf(json, sizeof(json), R"({"effect":"batch2_%d","props":{}})", i);
		TEST_ASSERT_TRUE(enqueueMessage(json));
	}
	TEST_ASSERT_EQUAL(12, testQueue.count);

	// Verify wraparound worked - head should have wrapped past tail
	// head started at 10, added 10 more = 20, wraps to 4 (20 % 16)
	// tail is at 8
	// So head (4) < tail (8) indicates wraparound
	TEST_ASSERT_TRUE(testQueue.head < testQueue.tail);

	// Drain and verify order - should get remaining batch1 then all batch2
	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_TRUE(msg.effect == "batch1_8");

	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_TRUE(msg.effect == "batch1_9");

	for (int i = 0; i < 10; i++) {
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

// Helper to get queue depth (mimics getUdpQueueDepth)
uint8_t getQueueDepth() {
	return testQueue.count;
}

void test_queue_depth_getter() {
	resetQueue();

	// Empty queue
	TEST_ASSERT_EQUAL(0, getQueueDepth());

	// Add some messages
	TEST_ASSERT_TRUE(enqueueMessage(R"({"effect":"a","props":{}})"));
	TEST_ASSERT_EQUAL(1, getQueueDepth());

	TEST_ASSERT_TRUE(enqueueMessage(R"({"effect":"b","props":{}})"));
	TEST_ASSERT_EQUAL(2, getQueueDepth());

	// Dequeue one
	UDPMessage msg;
	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_EQUAL(1, getQueueDepth());

	// Dequeue remaining
	TEST_ASSERT_TRUE(dequeueMessage(&msg));
	TEST_ASSERT_EQUAL(0, getQueueDepth());
}

void test_high_burst_traffic_with_larger_queue() {
	resetQueue();

	// Simulate high-load scenario: 12 rapid messages (would overflow old queue of 8)
	for (int i = 0; i < 12; i++) {
		char json[64];
		snprintf(json, sizeof(json), R"({"effect":"burst%d","props":{}})", i);
		TEST_ASSERT_TRUE(enqueueMessage(json));
	}
	TEST_ASSERT_EQUAL(12, testQueue.count);

	// All 12 messages should be retrievable (wouldn't fit in old queue of 8)
	UDPMessage msg;
	for (int i = 0; i < 12; i++) {
		TEST_ASSERT_TRUE(dequeueMessage(&msg));
		char expected[16];
		snprintf(expected, sizeof(expected), "burst%d", i);
		TEST_ASSERT_TRUE(msg.effect == expected);
	}

	TEST_ASSERT_EQUAL(0, testQueue.count);
}

void test_queue_handles_full_capacity() {
	resetQueue();

	// Fill queue to full capacity (16 messages)
	for (uint8_t i = 0; i < UDP_QUEUE_SIZE; i++) {
		char json[64];
		snprintf(json, sizeof(json), R"({"effect":"full%d","props":{}})", i);
		TEST_ASSERT_TRUE(enqueueMessage(json));
	}
	TEST_ASSERT_EQUAL(UDP_QUEUE_SIZE, testQueue.count);
	TEST_ASSERT_EQUAL(UDP_QUEUE_SIZE, getQueueDepth());

	// Next message should fail
	TEST_ASSERT_FALSE(enqueueMessage(R"({"effect":"overflow","props":{}})"));
	TEST_ASSERT_EQUAL(UDP_QUEUE_SIZE, testQueue.count);

	// Drain and verify all 16 messages are intact
	UDPMessage msg;
	for (uint8_t i = 0; i < UDP_QUEUE_SIZE; i++) {
		TEST_ASSERT_TRUE(dequeueMessage(&msg));
		char expected[16];
		snprintf(expected, sizeof(expected), "full%d", i);
		TEST_ASSERT_TRUE(msg.effect == expected);
	}
}

/**
 * Test that WiFiUDP mock properly supports buffer draining
 * This validates the fix for the UDP socket stall bug where only reading
 * 1 byte left the rx_buffer non-empty, causing parsePacket() to return 0 forever.
 */
void test_mock_udp_buffer_draining() {
	WiFiUDP mockUdp;

	// Inject a packet with known content
	IPAddress testIP(192, 168, 1, 100);
	mockUdp.injectPacket(testIP, 5000, R"({"effect":"test","props":{}})");

	// Parse the packet
	int packetSize = mockUdp.parsePacket();
	TEST_ASSERT_GREATER_THAN(0, packetSize);

	// Read only 1 byte (the old buggy behavior)
	char singleByte;
	mockUdp.read(&singleByte, 1);

	// available() should still show remaining bytes
	TEST_ASSERT_GREATER_THAN(0, mockUdp.available());

	// Drain the rest using the fix pattern: while(available()) read()
	int bytesRead = 0;
	while (mockUdp.available()) {
		mockUdp.read();
		bytesRead++;
	}

	// All remaining bytes should have been drained
	TEST_ASSERT_EQUAL(packetSize - 1, bytesRead);
	TEST_ASSERT_EQUAL(0, mockUdp.available());
}

/**
 * Test that after draining, new packets can be processed
 * This verifies recovery from the stall state
 */
void test_mock_udp_recovery_after_drain() {
	WiFiUDP mockUdp;
	IPAddress testIP(192, 168, 1, 100);

	// Inject first packet and simulate partial read (the bug trigger)
	mockUdp.injectPacket(testIP, 5000, R"({"effect":"first","props":{}})");
	mockUdp.parsePacket();

	// Partially read (bug behavior) then drain (fix behavior)
	char partial[5];
	mockUdp.read(partial, 5);
	while (mockUdp.available()) {
		mockUdp.read();
	}

	// Inject a second packet
	mockUdp.injectPacket(testIP, 5000, R"({"effect":"second","props":{}})");

	// Should be able to parse the new packet
	int packetSize = mockUdp.parsePacket();
	TEST_ASSERT_GREATER_THAN(0, packetSize);

	// Read and verify it's the second packet
	char buffer[256];
	mockUdp.read(buffer, sizeof(buffer) - 1);
	buffer[packetSize] = '\0';

	JsonDocument doc;
	DeserializationError err = deserializeJson(doc, buffer);
	TEST_ASSERT_FALSE(err);
	TEST_ASSERT_EQUAL_STRING("second", doc["effect"].as<const char*>());
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
	RUN_TEST(test_queue_depth_getter);
	RUN_TEST(test_high_burst_traffic_with_larger_queue);
	RUN_TEST(test_queue_handles_full_capacity);
	RUN_TEST(test_mock_udp_buffer_draining);
	RUN_TEST(test_mock_udp_recovery_after_drain);

	return UNITY_END();
}
