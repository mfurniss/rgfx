#ifndef MQTT_H
#define MQTT_H

#include <Arduino.h>
#include <WiFi.h>
#include <MQTTClient.h>

// MQTT broker server (discovered via mDNS)
extern String MQTT_SERVER;

// MQTT client
extern MQTTClient mqttClient;

// Test mode state
extern bool testModeActive;

// Function declarations
void setupMQTT();
void reconnectMQTT();
void mqttLoop();
void updateLEDs();
void sendDriverConnect();
void sendDriverHeartbeat();
void publishTestState(const String& state);

#endif
