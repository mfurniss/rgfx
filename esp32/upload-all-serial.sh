#!/bin/bash
set -e

cd "$(dirname "$0")"

# Find all connected ESP32 devices
PORTS=$(pio device list --serial | grep -E '/dev/cu\.usbserial' | awk '{print $1}')

if [ -z "$PORTS" ]; then
    echo "❌ No ESP32 devices found on USB"
    exit 1
fi

echo "Found devices:"
echo "$PORTS" | while read -r port; do echo "  - $port"; done
echo ""

# Build firmware once
echo "Building firmware..."
pio run

# Upload to each device sequentially
for PORT in $PORTS; do
    echo ""
    echo "=== Uploading to $PORT ==="
    pio run -t nobuild -t upload --upload-port "$PORT"
done

echo ""
echo "✅ All devices updated successfully!"
