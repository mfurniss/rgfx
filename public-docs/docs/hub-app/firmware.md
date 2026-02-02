# Firmware

!!! warning "Draft"
    This page is a placeholder and is under active development.

The Firmware page manages ESP32 driver firmware updates.

## Update Methods

### OTA WiFi

Update firmware over the network on already-configured drivers.

1. Select target drivers from the dropdown
2. Click **Update Firmware**
3. Confirm the update
4. Monitor progress for each driver

Multiple drivers can be updated in parallel. Each shows individual progress.

**WiFi Config (OTA)**: Push new WiFi credentials to selected drivers.

### USB Serial

Flash firmware directly via USB cable. Required for new ESP32 boards or recovery situations.

1. Connect ESP32 via USB
2. Select the serial port from the dropdown
3. Click **Update Firmware**
4. Confirm the flash operation

!!! warning
    USB flashing erases all driver settings including WiFi configuration. You'll need to reconfigure WiFi after flashing.

**WiFi Config (USB)**: Configure WiFi credentials on the connected device.

## Chip-Aware Updates

The Hub detects each driver's ESP32 chip type (ESP32, ESP32-S3, etc.) and loads the correct firmware variant automatically.

## Progress and Logging

The log display shows detailed progress during flashing operations.
