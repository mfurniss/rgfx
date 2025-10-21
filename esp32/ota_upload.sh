#!/bin/bash
# OTA Upload Script for RGFX Driver
# Usage: ./ota_upload.sh [IP_ADDRESS]

# Default IP address
DEFAULT_IP="192.168.10.86"
ESP_IP="${1:-$DEFAULT_IP}"

# Path to espota.py
ESPOTA="$HOME/.platformio/packages/framework-arduinoespressif32/tools/espota.py"

# Firmware path
FIRMWARE=".pio/build/rgfx-driver-ota/firmware.bin"

# OTA port
OTA_PORT=3232

echo "Building firmware..."
pio run -e rgfx-driver-ota

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo ""
echo "Uploading to $ESP_IP:$OTA_PORT..."
python3 "$ESPOTA" -i "$ESP_IP" -p "$OTA_PORT" -f "$FIRMWARE" -d

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ OTA upload successful!"
else
    echo ""
    echo "✗ OTA upload failed!"
    exit 1
fi
