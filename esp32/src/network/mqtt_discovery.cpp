#include "network/mqtt.h"
#include "log.h"
#include <WiFi.h>
#include <WiFiUdp.h>
#include <ArduinoJson.h>

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
						// Check if on same subnet
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
							log("MQTT broker discovered via UDP broadcast: " + String(mqttServerIP) + ":" + String(port));
							mqttServerDiscovered = true;

							// Update client with discovered broker address
							mqttClient.setHost(mqttServerIP, port);

							udp.stop();
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
