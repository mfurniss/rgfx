#ifndef MQTT_H
#define MQTT_H

#include <ArduinoJson.h>

#ifdef UNIT_TEST
// Unit test stubs - no-op implementations for code that publishes errors
inline void publishError(const char*, const char*, JsonDocument&) {}
inline void publishError(const char*, const char*) {}
#else

#include <Arduino.h>
#include <atomic>
#include <WiFi.h>
#include <MQTTClient.h>

// MQTT broker server IP (discovered via SSDP broadcast)
// Fixed-size char array avoids heap fragmentation from String operations
extern char mqttServerIP[16];  // "xxx.xxx.xxx.xxx\0"
extern bool mqttServerDiscovered;

// MQTT client
extern MQTTClient mqttClient;

// Test mode state (atomic for cross-core access safety)
extern std::atomic<bool> testModeActive;

// MQTT message statistics
extern uint32_t mqttMessagesReceived;

// Function declarations
void setupMQTT();
bool discoverMQTTBroker();
void reconnectMQTT();
void mqttLoop();
void sendDriverTelemetry();
void publishTestState(const String& state);
void publishError(const char* source, const char* errorMessage, JsonDocument& props);
void publishError(const char* source, const char* errorMessage);
void processPendingMqttOperations();

#endif  // UNIT_TEST
#endif  // MQTT_H
