#pragma once

// Network task - runs on Core 0 (protocol core)
// Handles MQTT, web server, OTA, and OLED display updates
void networkTask(void* parameter);
