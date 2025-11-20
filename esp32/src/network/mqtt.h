#ifndef MQTT_H
#define MQTT_H

#include <Arduino.h>
#include <WiFi.h>
#include <MQTTClient.h>

// MQTT broker server (discovered via SSDP)
extern String MQTT_SERVER;

// MQTT client
extern MQTTClient mqttClient;

// Test mode state
extern bool testModeActive;

// MQTT message statistics
extern uint32_t mqttMessagesReceived;

// Function declarations
void setupMQTT();
void reconnectMQTT();
void mqttLoop();
void sendDriverConnect();
void sendDriverHeartbeat();
void publishTestState(const String& state);

#endif
