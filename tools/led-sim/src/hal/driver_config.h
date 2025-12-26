// Native build version of driver_config.h
// This header is included instead of the ESP32 version for native builds

#ifndef DRIVER_CONFIG_H
#define DRIVER_CONFIG_H

#include <atomic>
#include <string>
#include <vector>
#include <cstdint>

// Use std::string as String for native builds
using String = std::string;

struct LEDDeviceConfig {
    String id;
    String name;
    uint8_t pin;
    String layout;
    uint16_t count;
    uint16_t offset;
    String chipset;
    String colorOrder;
    uint8_t maxBrightness;
    String colorCorrection;
    uint16_t width;
    uint16_t height;
    uint16_t panelWidth;
    uint16_t panelHeight;
    uint8_t unifiedRows;
    uint8_t unifiedCols;
    std::vector<uint8_t> panelOrder;
    std::vector<uint8_t> panelRotation;

    LEDDeviceConfig()
        : pin(0), count(0), offset(0), maxBrightness(255),
          width(0), height(0), panelWidth(0), panelHeight(0),
          unifiedRows(1), unifiedCols(1) {}
};

struct DriverConfigData {
    String name;
    String description;
    String version;
    std::vector<LEDDeviceConfig> devices;
    uint8_t globalBrightnessLimit;
    bool dithering;
    uint8_t updateRate;
    uint8_t powerSupplyVolts;
    uint16_t maxPowerMilliamps;
    float wifiTxPower;
    float gammaR;
    float gammaG;
    float gammaB;
    uint8_t floorR;
    uint8_t floorG;
    uint8_t floorB;

    DriverConfigData()
        : globalBrightnessLimit(255), dithering(true), updateRate(120),
          powerSupplyVolts(5), maxPowerMilliamps(2000), wifiTxPower(19.5f),
          gammaR(1.0f), gammaG(1.0f), gammaB(1.0f),
          floorR(0), floorG(0), floorB(0) {}
};

extern DriverConfigData g_driverConfig;
extern bool g_configReceived;
extern std::atomic<bool> g_configUpdateInProgress;

#endif
