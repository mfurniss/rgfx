/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOCK_MQTT_H
#define MOCK_MQTT_H

#ifdef UNIT_TEST

#include <string>
#include <cstdint>
#include <functional>
#include <vector>

/**
 * Mock MQTT Client for Unit Testing
 *
 * Simulates the arduino-mqtt MQTTClient library without requiring a real broker.
 * Mirrors the API from the arduino-mqtt library for use in native tests.
 *
 * Usage:
 *   #ifdef UNIT_TEST
 *   #include "test/mocks/mock_mqtt.h"
 *   #else
 *   #include <MQTTClient.h>
 *   #endif
 *
 * Features:
 *   - connect() always succeeds
 *   - publish() always succeeds
 *   - subscribe() always succeeds
 *   - connected() always returns true
 *   - Optional: Can be extended to track published messages for assertions
 */

// Mock WiFiClient (required by MQTTClient constructor)
class WiFiClient {
   public:
	int connect(const char* host, uint16_t port) {
		(void)host;
		(void)port;
		return 1;
	}
	void stop() {}
	bool connected() { return true; }
};

// Structure to capture published messages for test assertions
struct PublishedMessage {
	std::string topic;
	std::string payload;
	bool retained;
	int qos;
};

// Mock MQTTClient
class MQTTClient {
   public:
	using MessageCallback = std::function<void(std::string&, std::string&)>;

	// Published messages (accessible for test assertions)
	std::vector<PublishedMessage> publishedMessages;

   private:
	MessageCallback callback;
	bool isConnected;

   public:
	/**
	 * Constructor with buffer size
	 */
	MQTTClient(int bufferSize) : isConnected(false) { (void)bufferSize; }

	/**
	 * Constructor with read/write buffer sizes (used by mqtt.cpp)
	 */
	MQTTClient(int readBufSize, int writeBufSize) : isConnected(false) {
		(void)readBufSize;
		(void)writeBufSize;
	}

	/**
	 * Clear published messages (call in setUp)
	 */
	void clearPublishedMessages() { publishedMessages.clear(); }

	/**
	 * Get last published message (for assertions)
	 */
	const PublishedMessage* getLastPublished() const {
		return publishedMessages.empty() ? nullptr : &publishedMessages.back();
	}

	/**
	 * Initialize with broker and client
	 */
	void begin(const char* hostname, int port, WiFiClient& client) {
		(void)hostname;
		(void)port;
		(void)client;
	}

	/**
	 * Set message callback
	 */
	void onMessage(MessageCallback cb) { callback = cb; }

	/**
	 * Connect to broker (always succeeds in mock)
	 */
	bool connect(const char* clientId) {
		(void)clientId;
		isConnected = true;
		return true;
	}

	/**
	 * Connect with credentials (always succeeds in mock)
	 */
	bool connect(const char* clientId, const char* username, const char* password) {
		(void)clientId;
		(void)username;
		(void)password;
		isConnected = true;
		return true;
	}

	/**
	 * Disconnect from broker
	 */
	void disconnect() { isConnected = false; }

	/**
	 * Check if connected (always true after connect() in mock)
	 */
	bool connected() { return isConnected; }

	/**
	 * Subscribe to topic (always succeeds in mock)
	 */
	bool subscribe(const char* topic, int qos = 0) {
		(void)topic;
		(void)qos;
		return true;
	}

	/**
	 * Publish message (captures for test assertions)
	 */
	bool publish(const char* topic, const char* payload, bool retained = false, int qos = 0) {
		publishedMessages.push_back({topic, payload, retained, qos});
		return true;
	}

	/**
	 * Process incoming messages (no-op in mock)
	 */
	void loop() {}

	/**
	 * Set Last Will and Testament
	 */
	void setWill(const char* topic, const char* payload, bool retained = false, int qos = 0) {
		(void)topic;
		(void)payload;
		(void)retained;
		(void)qos;
	}

	/**
	 * Set keepalive interval
	 */
	void setKeepAlive(int seconds) { (void)seconds; }

	/**
	 * Set broker host
	 */
	void setHost(const char* hostname, int port = 1883) {
		(void)hostname;
		(void)port;
	}

	/**
	 * Get last error code
	 */
	int lastError() { return 0; }

	/**
	 * Get return code
	 */
	int returnCode() { return 0; }
};

#endif  // UNIT_TEST
#endif  // MOCK_MQTT_H
