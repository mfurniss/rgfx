#ifndef MQTT_H
#define MQTT_H

#include <Arduino.h>
#include <WiFi.h>
#include <MQTTClient.h>

// MQTT broker settings
extern String MQTT_SERVER;
extern const int MQTT_PORT;
extern const char* MQTT_USER;
extern const char* MQTT_PASSWORD;

// MQTT topics
extern const char* MQTT_TOPIC_TEST;
extern const char* MQTT_TOPIC_STATUS;

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

#endif
