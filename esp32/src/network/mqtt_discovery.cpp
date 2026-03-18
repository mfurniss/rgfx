#include "network/mqtt.h"
#include "config/config_nvs.h"
#include "config/constants.h"
#include "log.h"
#include <WiFi.h>
#include <WiFiUdp.h>
#include <ESPmDNS.h>
#include <ArduinoJson.h>

// Subnet validation helper - checks if two IPs are on the same subnet
static bool isSameSubnet(IPAddress a, IPAddress b, IPAddress mask) {
	for (int j = 0; j < 4; j++) {
		if ((a[j] & mask[j]) != (b[j] & mask[j])) {
			return false;
		}
	}
	return true;
}

// Log network diagnostic info for debugging discovery issues
void logNetworkDiagnostics() {
	IPAddress ip = WiFi.localIP();
	IPAddress subnet = WiFi.subnetMask();
	IPAddress gateway = WiFi.gatewayIP();

	// Calculate broadcast address from IP and subnet mask
	IPAddress broadcast;
	for (int i = 0; i < 4; i++) {
		broadcast[i] = ip[i] | ~subnet[i];
	}

	log("Network: IP=" + ip.toString() +
	    " Subnet=" + subnet.toString() +
	    " Gateway=" + gateway.toString() +
	    " Broadcast=" + broadcast.toString());
}

// Helper to set broker state after successful discovery
static void setBrokerDiscovered(const char* ipStr, int port, const char* method) {
	strncpy(mqttServerIP, ipStr, sizeof(mqttServerIP) - 1);
	mqttServerIP[sizeof(mqttServerIP) - 1] = '\0';
	mqttServerDiscovered = true;
	mqttDiscoveryMethod = method;
	mqttClient.setHost(mqttServerIP, port);
	ConfigNVS::saveBrokerIP(String(mqttServerIP));
	log("MQTT broker discovered via " + String(method) + ": " + String(mqttServerIP) + ":" + String(port));
}

// Try connecting using cached broker IP from NVS
bool tryLastKnownBroker() {
	String cachedIP = ConfigNVS::loadBrokerIP();
	if (cachedIP.length() == 0) {
		return false;
	}

	log("Trying cached broker IP: " + cachedIP);

	strncpy(mqttServerIP, cachedIP.c_str(), sizeof(mqttServerIP) - 1);
	mqttServerIP[sizeof(mqttServerIP) - 1] = '\0';
	mqttServerDiscovered = true;
	mqttDiscoveryMethod = "cached";
	mqttClient.setHost(mqttServerIP, MQTT_PORT);

	return true;
}

// Discover MQTT broker via mDNS service query
// Queries for _rgfx-mqtt._tcp services advertised by the Hub
bool discoverMQTTBrokerMdns() {
	IPAddress ourIP = WiFi.localIP();
	IPAddress ourSubnet = WiFi.subnetMask();

	log("Querying mDNS for _rgfx-mqtt._tcp...");

	int found = MDNS.queryService("rgfx-mqtt", "tcp");
	if (found <= 0) {
		log("No mDNS services found");
		return false;
	}

	log("Found " + String(found) + " mDNS service(s)");

	for (int i = 0; i < found; i++) {
		IPAddress brokerIP = MDNS.IP(i);
		int port = MDNS.port(i);

		// Try TXT record "ip" field first (Hub sets this explicitly)
		String txtIP = MDNS.txt(i, "ip");
		if (txtIP.length() > 0) {
			IPAddress parsedIP;
			if (parsedIP.fromString(txtIP)) {
				brokerIP = parsedIP;
			}
		}

		if (port <= 0) {
			port = MQTT_PORT;
		}

		if (!isSameSubnet(ourIP, brokerIP, ourSubnet)) {
			log("mDNS broker on different subnet (" + brokerIP.toString() + ") - ignoring");
			continue;
		}

		setBrokerDiscovered(brokerIP.toString().c_str(), port, "mDNS");
		return true;
	}

	return false;
}

// Discover MQTT broker via UDP broadcast
// Listens for discovery announcements from Hub - single attempt called periodically from networkTask
bool discoverMQTTBroker() {
	IPAddress ourIP = WiFi.localIP();
	IPAddress ourSubnet = WiFi.subnetMask();

	WiFiUDP udp;
	const uint16_t discoveryPort = 8889;

	// Bind to discovery port to receive broadcasts
	if (!udp.begin(discoveryPort)) {
		log("Failed to bind UDP discovery port " + String(discoveryPort));
		return false;
	}

	log("Listening for broker discovery broadcasts on port " + String(discoveryPort) + "...");

	// Listen for broadcasts (Hub sends every 5 seconds, so wait 6 seconds minimum)
	unsigned long startTime = millis();
	uint16_t packetsReceived = 0;
	while (millis() - startTime < 6000) {
		int packetSize = udp.parsePacket();
		if (packetSize > 0) {
			packetsReceived++;
			log("Received discovery packet #" + String(packetsReceived) + " (" + String(packetSize) + " bytes) from " + udp.remoteIP().toString());

			char packet[512];
			int len = udp.read(packet, sizeof(packet) - 1);
			if (len <= 0 || len >= (int)sizeof(packet)) {
				log("Invalid packet length: " + String(len));
				continue;
			}
			packet[len] = '\0';

			// Parse JSON message: {"service":"rgfx-mqtt-broker","ip":"192.168.10.23","port":1883}
			JsonDocument doc;
			DeserializationError error = deserializeJson(doc, packet);

			if (error) {
				log("Failed to parse discovery message: " + String(error.c_str()));
				continue;
			}

			// Check if this is an RGFX MQTT broker announcement
			const char* service = doc["service"];
			if (service && String(service) == "rgfx-mqtt-broker") {
				const char* ipStr = doc["ip"];
				int port = doc["port"] | 0;

				if (ipStr && port > 0) {
					IPAddress brokerIP;
					if (brokerIP.fromString(ipStr)) {
						if (isSameSubnet(ourIP, brokerIP, ourSubnet)) {
							udp.stop();
							setBrokerDiscovered(ipStr, port, "UDP broadcast");
							return true;
						} else {
							log("Broker on different subnet - ignoring");
						}
					}
				}
			}
		}
		delay(10);
	}

	log("No broker discovery broadcasts received within timeout");
	udp.stop();
	return false;
}
