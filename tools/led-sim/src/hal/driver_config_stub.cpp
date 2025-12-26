// Native build stubs for driver_config.h dependencies
// These provide minimal implementations for the simulator

#ifndef ESP32

#include <atomic>
#include <string>
#include <vector>
#include <cstdint>

// Use std::string as String for native builds
using String = std::string;

// Minimal LEDDeviceConfig for native build
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

// Global instances
DriverConfigData g_driverConfig;
bool g_configReceived = false;
std::atomic<bool> g_configUpdateInProgress{false};

// Test mode flag
bool testModeActive = false;

// Gamma LUT tables
uint8_t g_gammaLutR[256];
uint8_t g_gammaLutG[256];
uint8_t g_gammaLutB[256];

#endif // !ESP32
