/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOCK_WIFI_UDP_H
#define MOCK_WIFI_UDP_H

#ifdef UNIT_TEST

#include <cstdint>
#include <cstring>
#include <string>
#include <queue>

/**
 * Mock IPAddress class for native testing
 */
class IPAddress {
  public:
	uint8_t octets[4] = {0, 0, 0, 0};

	IPAddress() = default;
	IPAddress(uint8_t a, uint8_t b, uint8_t c, uint8_t d) {
		octets[0] = a;
		octets[1] = b;
		octets[2] = c;
		octets[3] = d;
	}

	bool fromString(const char* str) {
		// Simple IP parsing for testing
		int a, b, c, d;
		if (sscanf(str, "%d.%d.%d.%d", &a, &b, &c, &d) == 4) {
			octets[0] = a;
			octets[1] = b;
			octets[2] = c;
			octets[3] = d;
			return true;
		}
		return false;
	}

	bool fromString(const std::string& str) { return fromString(str.c_str()); }

	std::string toString() const {
		char buf[16];
		snprintf(buf, sizeof(buf), "%d.%d.%d.%d", octets[0], octets[1], octets[2], octets[3]);
		return std::string(buf);
	}

	uint8_t operator[](int index) const { return octets[index]; }
	uint8_t& operator[](int index) { return octets[index]; }

	bool operator==(const IPAddress& other) const {
		return memcmp(octets, other.octets, 4) == 0;
	}

	bool operator!=(const IPAddress& other) const { return !(*this == other); }
};

/**
 * Mock packet data for WiFiUDP
 */
struct MockUDPPacket {
	IPAddress remoteIP;
	uint16_t remotePort;
	std::string data;
};

/**
 * Mock WiFiUDP class for native testing
 */
class WiFiUDP {
  public:
	std::queue<MockUDPPacket> incomingPackets;
	MockUDPPacket currentPacket;
	size_t readPosition = 0;
	bool listening = false;
	uint16_t listenPort = 0;

	bool begin(uint16_t port) {
		listenPort = port;
		listening = true;
		return true;
	}

	void stop() {
		listening = false;
		listenPort = 0;
	}

	int parsePacket() {
		if (incomingPackets.empty()) {
			return 0;
		}
		currentPacket = incomingPackets.front();
		incomingPackets.pop();
		readPosition = 0;
		return currentPacket.data.size();
	}

	IPAddress remoteIP() { return currentPacket.remoteIP; }

	uint16_t remotePort() { return currentPacket.remotePort; }

	int read(char* buffer, size_t maxLen) {
		size_t remaining = currentPacket.data.size() - readPosition;
		size_t toRead = (remaining < maxLen) ? remaining : maxLen;
		memcpy(buffer, currentPacket.data.c_str() + readPosition, toRead);
		readPosition += toRead;
		return toRead;
	}

	// Read single byte (used for buffer draining)
	int read() {
		if (readPosition >= currentPacket.data.size()) {
			return -1;
		}
		return currentPacket.data[readPosition++];
	}

	// Check available bytes in current packet (used for buffer draining)
	int available() { return currentPacket.data.size() - readPosition; }

	// Helper for tests to inject packets
	void injectPacket(const IPAddress& ip, uint16_t port, const std::string& data) {
		MockUDPPacket pkt;
		pkt.remoteIP = ip;
		pkt.remotePort = port;
		pkt.data = data;
		incomingPackets.push(pkt);
	}
};

#endif  // UNIT_TEST
#endif  // MOCK_WIFI_UDP_H
