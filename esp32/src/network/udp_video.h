#pragma once
#ifndef UDP_VIDEO_H
#define UDP_VIDEO_H

#include <Arduino.h>
#include "config/constants.h"

// Video frame protocol constants
static constexpr uint8_t VIDEO_MAGIC = 0x56;
static constexpr uint8_t VIDEO_FLAG_LAST_FRAGMENT = 0x01;
static constexpr size_t VIDEO_HEADER_SIZE = 8;
static constexpr size_t VIDEO_MAX_PAYLOAD = UDP_BUFFER_SIZE - VIDEO_HEADER_SIZE;

// Maximum frame buffer size (supports up to 128x64 RGB24 = 24,576 bytes)
static constexpr size_t VIDEO_MAX_FRAME_SIZE = 128 * 64 * 3;

// Auto-deactivate timeout when no frames received (milliseconds)
static constexpr uint32_t VIDEO_FRAME_TIMEOUT_MS = 500;

// Process a binary video packet received on the shared UDP port.
// Called by processUDP() when the first byte matches VIDEO_MAGIC.
void handleVideoPacket(const uint8_t* data, size_t length);

// Called by VideoEffect to access the latest complete frame
// Returns pointer to front buffer (RGB24 data), or nullptr if no frame available
const uint8_t* getVideoFrame();

// Returns true if a new frame has arrived since last call to getVideoFrame()
bool hasNewVideoFrame();

// Set the expected frame size based on matrix dimensions
void setVideoFrameSize(uint16_t width, uint16_t height);

// Get timestamp of last received complete frame (for timeout detection)
uint32_t getLastVideoFrameTime();

#endif // UDP_VIDEO_H
