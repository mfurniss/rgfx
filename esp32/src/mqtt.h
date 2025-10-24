#ifndef MQTT_H
#define MQTT_H

#include <Arduino.h>
#include <WiFi.h>
#include <MQTTClient.h>

// MQTT broker settings
extern String MQTT_SERVER;
extern const int MQTT_PORT;
extern const char* MQTT_CLIENT_ID;
extern const char* MQTT_USER;
extern const char* MQTT_PASSWORD;

// MQTT topics
extern const char* MQTT_TOPIC_TEST;
extern const char* MQTT_TOPIC_STATUS;

// MQTT client
extern MQTTClient mqttClient;

// Effect control variables (shared with main.cpp)
enum Effect { SPARKLE, WAVE, FIRE };
extern Effect currentEffect;
extern bool autoSwitch;
extern bool powerOn;
extern uint8_t currentBrightness;
extern uint32_t lastSwitchTime;

// Function declarations
void setupMQTT();
void reconnectMQTT();
void mqttLoop();
void updateLEDs();
void sendDriverConnect();

#endif
